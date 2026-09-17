import { Customer, CustomerComplete, CustomerMembership } from '@/customer/types'
import { createClient } from '@/lib/supabase/server'
import { getWeekRange } from '@/lib/week'
import { getApplicableDiscountForCustomer, getGroupsByCustomer } from '@/group/api/server'
import {
  fetchCustomersPageWith,
  type CustomersPage,
  type FetchCustomersPageOptions,
} from '@/customer/api/customers-query'

// Primera página del listado, renderizada en el server. El query vive en
// `customers-query.ts` y lo comparte con `fetchCustomersPage` del cliente.
//
// Degrada a lista vacía en vez de propagar el error: es el comportamiento que ya
// tenía la v1 y evita que un fallo de Supabase tire la página entera. En la v2 el
// listado re-consulta desde el cliente ante cualquier cambio de filtro, y ahí sí
// el error se muestra.
export const searchAllCustomers = async (
  options: FetchCustomersPageOptions = {}
): Promise<CustomersPage> => {
  const supabase = await createClient()

  try {
    return await fetchCustomersPageWith(supabase, options)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching customers:', error)

    return { customers: [], total: 0 }
  }
}

export const searchCustomersById = async (id: string): Promise<CustomerComplete | null> => {
  const supabase = await createClient()
  const week = getWeekRange()

  // Ejecutar las consultas en paralelo con Promise.all para evitar waterfalls.
  // Grupos y descuento aplicable van acá también — precomputados por el server
  // para que el form individual no tenga que re-consultar en cliente.
  const [
    { data: customer, error: customerError },
    { data: membership },
    { data: assistances },
    { data: lastPayment },
    groups,
    applicableDiscount,
  ] = await Promise.all([
    supabase.from('customers').select('*').eq('id', id).single(),
    supabase.from('customer_membership').select().eq('customer_id', id).single(),
    supabase
      .from('assistance')
      .select('assistance_date')
      .eq('customer_id', id)
      .gte('assistance_date', week.start.toISOString())
      .lte('assistance_date', week.end.toISOString())
      .order('assistance_date', { ascending: true }),
    // Último pago registrado del cliente: la forma de pago vive en
    // membership_payments (la renovación la inserta ahí), no en customer_membership.
    supabase
      .from('membership_payments')
      .select('payment_method')
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    getGroupsByCustomer(id),
    // Nota: paso null como bruto → hoy la única regla es fixed y no lo necesita.
    // Cuando se agregue una regla percent, hay que pasar el bruto del tipo
    // actual (query extra a types_memberships).
    getApplicableDiscountForCustomer(id, null),
  ])

  if (customerError || !customer) {
    return null
  }

  return {
    ...customer,
    customer_membership: membership || null,
    assistance: assistances || [],
    last_payment_method: lastPayment?.payment_method ?? null,
    groups,
    applicable_discount: applicableDiscount,
  }
}

// Función auxiliar para obtener solo los datos básicos del cliente
export async function getCustomerBasic(id: string): Promise<Customer | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('customers').select('*').eq('id', id).single()

  if (error || !data) return null

  return data as Customer
}

// Función auxiliar para obtener solo la membresía
export async function getCustomerMembership(
  customerId: string
): Promise<CustomerMembership | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('customer_membership')
    .select('membership_type')
    .eq('customer_id', customerId)
    .single()

  if (error || !data) {
    return null
  }

  return data as CustomerMembership
}
