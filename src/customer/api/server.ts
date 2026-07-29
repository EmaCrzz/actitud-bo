import { CUSTOMERS_PAGE_SIZE, SEARCH_CUSTOMER } from '@/customer/consts'
import {
  Customer,
  CustomerComplete,
  CustomerMembership,
  CustomerWithMembership,
} from '@/customer/types'
import { createClient } from '@/lib/supabase/server'
import { getWeekRange } from '@/lib/week'
import { mapCustomerRow } from '@/customer/utils'
import { getApplicableDiscountForCustomer, getGroupsByCustomer } from '@/group/api/server'

interface SearchAllCustomersOptions {
  query?: string
  page?: number
  pageSize?: number
}

export const searchAllCustomers = async ({
  query,
  page = 0,
  pageSize = CUSTOMERS_PAGE_SIZE,
}: SearchAllCustomersOptions = {}): Promise<CustomerWithMembership[]> => {
  const supabase = await createClient()
  const from = page * pageSize
  const to = from + pageSize - 1

  let request = supabase
    .from('customers')
    .select(SEARCH_CUSTOMER)
    .order('first_name', { ascending: true })
    .order('id', { ascending: true })
    .range(from, to)

  if (query) {
    request = request.ilike('first_name', `%${query}%`)
  }

  const { data } = await request

  return (data ?? []).map(mapCustomerRow)
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
