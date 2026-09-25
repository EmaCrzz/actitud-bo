import { createClient } from '@/lib/supabase/client'
import { CustomerMembership } from '@/customer/types'
import { ActiveMembership, MembershipType } from '@/membership/types'
import type { MembershipTypes } from '@/membership/consts'
import { getMembershipPeriodStart } from '@/membership/period'
import { getMonthRangeInAppTz, getTodayRangeInAppTz } from '@/lib/timezone'

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
  const { start: startOfMonth, end: endOfMonth } = getMonthRangeInAppTz()
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
    .lt('assistance.assistance_date', endOfMonth.toISOString())
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

  // Activas = expiran en el rango del día AR de hoy o posterior. Comparar
  // contra el inicio del día AR (no contra `now()`) evita perder registros
  // guardados como medianoche UTC del día actual (típico de dailys).
  const { start: todayStartInAppTz } = getTodayRangeInAppTz()

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
    .gte('expiration_date', todayStartInAppTz.toISOString())
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

  // Obtener todos los últimos pagos en una sola consulta. Ordena por
  // `payment_date` = el cobro más reciente, que desde el issue #59 es de verdad
  // el último: antes ordenaba por inicio de período, así que un cobro cargado
  // hoy para un período viejo se colaba al frente y uno anticipado quedaba
  // primero antes de haber ocurrido.
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

/**
 * Todo lo que el panel de renovación necesita saber del cliente antes de poder
 * proponer un cobro (Fase 8).
 *
 * Son cuatro datos que hoy no devuelve ningún fetch existente:
 * `fetchCustomerProfile` no trae ni las asistencias del mes ni el descuento, y
 * `fetchCustomerModalData` mira la semana, no el mes contable.
 */
export interface RenewalContext {
  /** Plan vigente — con lo que arranca preseleccionado el select de tipo. */
  membership_type: MembershipTypes | null
  /** Vencimiento vigente. Es el origen del prefill del período. */
  expiration_date: string | null
  /**
   * Inicio del período vigente, vía `getMembershipPeriodStart()`.
   *
   * Lo necesita el aviso de cambio de tipo: el RPC pisa el pago existente
   * —conservándole el `receipt_number`— cuando el `start_date` que llega cae el
   * mismo día calendario AR que este valor. Es la misma resolución
   * `start_date ?? last_payment_date` que hace la función en SQL.
   */
  period_start: string | null
  /**
   * ¿Registró asistencias en el mes contable en curso?
   *
   * Input obligatorio de `getSuggestedCharge()`: es lo único que distingue mora
   * de ingreso a mitad de mes. Sin él, a alguien que se suma el día 20 se le
   * sugeriría un recargo que no debe.
   */
  has_assistances_this_month: boolean
  /** Último método de pago usado. Prefija el select de forma de pago. */
  last_payment_method: string | null
}

export async function fetchRenewalContext(customerId: string): Promise<RenewalContext> {
  const supabase = createClient()
  const { start, end } = getMonthRangeInAppTz()

  const [{ data: membership }, { count }, { data: lastPayment }] = await Promise.all([
    supabase
      .from('customer_membership')
      .select('membership_type, expiration_date, start_date, last_payment_date')
      .eq('customer_id', customerId)
      .maybeSingle(),
    // `head: true` trae el count sin las filas: sólo importa si hay alguna.
    supabase
      .from('assistance')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .gte('assistance_date', start.toISOString())
      .lt('assistance_date', end.toISOString()),
    // La forma de pago vive en membership_payments, no en customer_membership.
    // Es admin-only por RLS: para un no-admin la consulta devuelve vacío y el
    // select arranca sin preselección, que es una degradación aceptable.
    supabase
      .from('membership_payments')
      .select('payment_method')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  return {
    membership_type: (membership?.membership_type as MembershipTypes | undefined) ?? null,
    expiration_date: membership?.expiration_date ?? null,
    period_start: membership ? getMembershipPeriodStart(membership) : null,
    has_assistances_this_month: (count ?? 0) > 0,
    last_payment_method: lastPayment?.payment_method ?? null,
  }
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
