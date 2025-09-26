import { createClient } from "@/lib/supabase/client";
import { CustomerMembership } from "@/customer/types";
import { ActiveMembership } from "@/membership/types";

// Función para obtener clientes con asistencias del mes pero sin membresía activa (pendientes de pago)
export async function getPendingPaymentCustomers() {
  const supabase = createClient()
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  const now = new Date()

  const { data, error } = await supabase
    .from('customers')
    .select(`
      id,
      first_name,
      last_name,
      person_id,
      phone,
      email,
      assistance_count,
      created_at,
      assistance!inner (
        id,
        assistance_date
      ),
      customer_membership (
        id,
        membership_type,
        last_payment_date,
        expiration_date,
        created_at
      )
    `)
    .gte('assistance.assistance_date', startOfMonth.toISOString())
    .lte('assistance.assistance_date', endOfMonth.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    return { data: [], error }
  }

  // Filtrar clientes sin membresía activa y eliminar duplicados
  const pendingCustomers = data.filter((customer) => {
    // Si no tiene customer_membership, es pendiente
    if (!customer.customer_membership || customer.customer_membership.length === 0) {
      return true
    }

    // Si tiene membresía pero está expirada, es pendiente
    const membership = customer.customer_membership as unknown as CustomerMembership

    if (!membership || !membership.expiration_date) {
      return true
    }

    return new Date(membership.expiration_date) <= now
  })

  // Filtrar duplicados por customer_id ya que puede haber múltiples asistencias
  const uniqueCustomers = pendingCustomers.reduce((acc, customer) => {
    if (!acc.find(c => c.id === customer.id)) {
      acc.push(customer)
    }

    return acc
  }, [] as typeof pendingCustomers)

  return { data: uniqueCustomers, error: null }
}

// Función para obtener membresías activas
export async function getActiveMemberships() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('customer_membership')
    .select(`
      id,
      membership_type,
      last_payment_date,
      expiration_date,
      created_at,
      customers (
        id,
        first_name,
        last_name,
        person_id,
        phone,
        email,
        assistance_count,
        created_at
      )
    `)
    .gt('expiration_date', new Date().toISOString())
    .order('expiration_date', { ascending: true })

  if (error) {
    return { data: null, error }
  }

  return { data: data as unknown as ActiveMembership[], error: null }
}