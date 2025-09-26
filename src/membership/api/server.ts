import { CustomerMembership } from "@/customer/types";
import { createClient } from "@/lib/supabase/server";
import { ActiveMembership } from "@/membership/types";

type MembershipStatsRPCResult = {
  segment_type: string
  segment_count: number
  total_count: number
}

type MembershipSegment = {
  type: string
  count: number
  color: string
}

// Función para obtener membresías activas
export async function getActiveMemberships() {
  const supabase = await createClient()
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
    // eslint-disable-next-line no-console
    console.error('Error fetching active memberships:', error)

    return { data: null, error }
  }

  return { data: data as unknown as ActiveMembership[], error: null }
}

// Función para obtener clientes con asistencias del mes pero sin membresía activa (pendientes de pago)
export async function getPendingPaymentCustomers() {
  const supabase = await createClient()
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
    // eslint-disable-next-line no-console
    console.error('Error fetching pending payment customers:', error)

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

// Función para obtener membresías typo MEMBERSHIP_TYPE_DAILY en lo que va del mes
export async function getDailyMembershipsThisMonth() {
  const supabase = await createClient()
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
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
    .eq('membership_type', 'MEMBERSHIP_TYPE_DAILY')
    .gte('created_at', startOfMonth.toISOString())
    .order('created_at', { ascending: true })

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching daily memberships:', error)

    return { data: [], error }
  }

  return { data: data as unknown as ActiveMembership[], error: null }
}

// Función para obtener estadísticas de membresías activas por tipo (optimizada con RPC)
export async function getMembershipStats(year?: number, month?: number) {
  const supabase = await createClient()

  const { data: rpcData, error } = await supabase
    .rpc('get_membership_stats', {
      target_year: year || null,
      target_month: month || null
    })

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching membership stats:', error)
    return { data: null, error }
  }

  // Mapear colores por tipo
  const colorMap: Record<string, string> = {
    'MEMBERSHIP_TYPE_5_DAYS': '500',
    'MEMBERSHIP_TYPE_3_DAYS': '700',
    'MEMBERSHIP_TYPE_DAILY': '300',
    'PENDING_PAYMENT': '200'
  }

  // Transformar datos de RPC al formato esperado
  const memberships: MembershipSegment[] = (rpcData as MembershipStatsRPCResult[]).map((row) => ({
    type: row.segment_type,
    count: Number(row.segment_count),
    color: colorMap[row.segment_type] || '400'
  }))

  // Calcular total
  const total = memberships.reduce((sum, membership) => sum + membership.count, 0)

  return {
    data: {
      total,
      memberships
    },
    error: null
  }
}