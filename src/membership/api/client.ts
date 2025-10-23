import { createClient } from '@/lib/supabase/client'
import { CustomerMembership } from '@/customer/types'
import { ActiveMembership, MembershipType } from '@/membership/types'

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

// Función para obtener clientes con asistencias del mes pero sin membresía activa (pendientes de pago)
export async function getPendingPaymentCustomers() {
  const supabase = createClient()
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  const now = new Date()

  const { data, error } = await supabase
    .from('customers')
    .select(
      `
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
    `
    )
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
  const uniqueCustomers = pendingCustomers.reduce(
    (acc, customer) => {
      if (!acc.find((c) => c.id === customer.id)) {
        acc.push(customer)
      }

      return acc
    },
    [] as typeof pendingCustomers
  )

  return { data: uniqueCustomers, error: null }
}

// Función para obtener membresías activas
export async function getActiveMemberships() {
  const supabase = createClient()

  // Primero obtenemos las membresías activas
  const { data: memberships, error } = await supabase
    .from('customer_membership')
    .select(
      `
      id,
      membership_type,
      last_payment_date,
      expiration_date,
      created_at,
      customer_id,
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
    `
    )
    .gt('expiration_date', new Date().toISOString())
    .order('expiration_date', { ascending: true })

  if (error) {
    console.error('Error fetching memberships:', error)

    return { data: null, error }
  }

  if (!memberships || memberships.length === 0) {
    return { data: [], error: null }
  }

  // Obtener todos los customer_ids
  const customerIds = memberships.map((m) => m.customer_id)

  // Obtener todos los últimos pagos en una sola consulta
  const { data: allPayments } = await supabase
    .from('membership_payments')
    .select('customer_id, amount, payment_method, payment_date')
    .in('customer_id', customerIds)
    .order('payment_date', { ascending: false })

  // Crear un mapa de customer_id -> último pago
  const paymentMap = new Map()

  if (allPayments) {
    allPayments.forEach((payment) => {
      if (!paymentMap.has(payment.customer_id)) {
        paymentMap.set(payment.customer_id, {
          amount: payment.amount,
          payment_method: payment.payment_method,
          payment_date: payment.payment_date,
        })
      }
    })
  }

  // Combinar membresías con sus últimos pagos
  const membershipsWithPayments = memberships.map((membership) => ({
    ...membership,
    last_payment: paymentMap.get(membership.customer_id) || null,
  }))

  return { data: membershipsWithPayments as unknown as ActiveMembership[], error: null }
}

// Función para obtener estadísticas de membresías activas por tipo (optimizada con RPC)
export async function getMembershipStats(year?: number, month?: number) {
  const supabase = createClient()

  const { data: rpcData, error } = await supabase.rpc('get_membership_stats', {
    target_year: year || null,
    target_month: month || null,
  })

  if (error) {
    return { data: null, error }
  }

  // Mapear colores por tipo
  const colorMap: Record<string, string> = {
    MEMBERSHIP_TYPE_5_DAYS: '500',
    MEMBERSHIP_TYPE_3_DAYS: '700',
    MEMBERSHIP_TYPE_DAILY: '300',
    PENDING_PAYMENT: '800',
  }

  // Transformar datos de RPC al formato esperado
  const memberships: MembershipSegment[] = (rpcData as MembershipStatsRPCResult[]).map((row) => ({
    type: row.segment_type,
    count: Number(row.segment_count),
    color: colorMap[row.segment_type] || '400',
  }))

  // Calcular total
  const total = memberships.reduce((sum, membership) => sum + membership.count, 0)

  return {
    data: {
      total,
      memberships,
    },
    error: null,
  }
}

// Función para obtener tipos de membresías activos con sus amounts
export async function getMembershipTypes(typeFilter?: string) {
  const supabase = createClient()

  let query = supabase
    .from('types_memberships')
    .select('id, type, amount, amount_surcharge, middle_amount, last_update')
    .not('amount', 'is', null)
    .order('type', { ascending: true })

  if (typeFilter) {
    query = query.eq('type', typeFilter)
  }

  const { data, error } = await query

  if (error) {
    return { data: [], error }
  }

  return { data: data as MembershipType[], error: null }
}

// Función para actualizar precios de membresía
export async function updateMembershipPrices(
  membershipId: string,
  prices: {
    amount?: number
    amount_surcharge?: number
    middle_amount?: number
  }
) {
  const supabase = createClient()

  // Primero verificar que el registro existe
  const { data: existingData, error: findError } = await supabase
    .from('types_memberships')
    .select('id, type')
    .eq('id', membershipId)
    .single()

  if (findError || !existingData) {
    // eslint-disable-next-line no-console
    console.error('Membership not found:', { membershipId, findError })

    // Vamos a listar todos los IDs disponibles para debug
    const { data: allTypes } = await supabase.from('types_memberships').select('id, type')

    // eslint-disable-next-line no-console
    console.log('Available membership types:', allTypes)

    return {
      data: null,
      error: {
        message: 'Membership type not found',
        code: 'NOT_FOUND',
      },
    }
  }

  const { data, error } = await supabase
    .from('types_memberships')
    .update(prices)
    .eq('id', membershipId)
    .select('id, type, amount, amount_surcharge, middle_amount, last_update')
    .single()

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Update error:', { error, membershipId, prices })

    return { data: null, error }
  }

  return { data: data as MembershipType, error: null }
}
