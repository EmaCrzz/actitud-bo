import { CustomerMembership } from '@/customer/types'
import { createClient } from '@/lib/supabase/server'
import { ActiveMembership, MembershipPlan, MembershipType } from '@/membership/types'
import { MEMBERSHIP_TYPE_COLUMNS } from '../consts'
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

// Función para obtener membresías activas
export async function getActiveMemberships() {
  const supabase = await createClient()
  // Activas = expiran en el rango del día AR de hoy o posterior. Comparar
  // contra el inicio del día AR (no contra `now()`) evita perder registros
  // guardados como medianoche UTC del día actual.
  const { start: todayStartInAppTz } = getTodayRangeInAppTz()
  const { data, error } = await supabase
    .from('customer_membership')
    .select(
      `
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
    `
    )
    .gte('expiration_date', todayStartInAppTz.toISOString())
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

// Función para obtener membresías typo MEMBERSHIP_TYPE_DAILY en lo que va del mes
export async function getDailyMembershipsThisMonth() {
  const supabase = await createClient()
  const { start: startOfMonth } = getMonthRangeInAppTz()
  const { data, error } = await supabase
    .from('customer_membership')
    .select(
      `
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
    `
    )
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

  const { data: rpcData, error } = await supabase.rpc('get_membership_stats', {
    target_year: year || null,
    target_month: month || null,
  })

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching membership stats:', error)

    return { data: null, error }
  }

  // Mapear colores por tipo
  const colorMap: Record<string, string> = {
    MEMBERSHIP_TYPE_5_DAYS: '500',
    MEMBERSHIP_TYPE_3_DAYS: '700',
    MEMBERSHIP_TYPE_2_DAYS: '800',
    MEMBERSHIP_TYPE_DAILY: '300',
    MEMBERSHIP_TYPE_VIP: '900',
    PENDING_PAYMENT: '200',
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

interface GetMembershipTypesOptions {
  /** Filtrar a un solo tipo. */
  type?: string
  /**
   * Incluir los planes con `amount IS NULL`. **Por defecto `false`, que es lo
   * que v1 espera.**
   *
   * El filtro vive acá desde siempre y hoy no excluye a nadie: las 5 filas
   * tienen precio, **el VIP incluido, cargado con `0` y no con NULL** (medido
   * en dev el 2026-09-28). O sea que la tabla de precios de v1 sí lista el
   * VIP, y sólo bloquea su edición más adelante.
   *
   * Se mantiene porque la columna es nullable y un plan sin precio sería
   * invisible en la sección que existe justamente para administrarlos. La
   * sección de la Fase 10 lo pone en `true`; v1 se queda con el default para
   * no cambiar de comportamiento sin que nadie lo haya pedido.
   */
  includeUnpriced?: boolean
  /** Incluir los planes discontinuados (`active = false`). Por defecto `false`. */
  includeInactive?: boolean
}

// Tipos de membresía con sus precios.
export async function getMembershipTypes({
  type,
  includeUnpriced = false,
  includeInactive = false,
}: GetMembershipTypesOptions = {}) {
  const supabase = await createClient()

  let query = supabase
    .from('types_memberships')
    .select(MEMBERSHIP_TYPE_COLUMNS)
    .order('type', { ascending: true })

  if (!includeUnpriced) query = query.not('amount', 'is', null)
  if (!includeInactive) query = query.eq('active', true)
  if (type) query = query.eq('type', type)

  const { data, error } = await query

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching membership types:', error)

    return { data: [], error }
  }

  return { data: data as MembershipType[], error: null }
}

/**
 * Los planes como los muestra la sección Membresías (Fase 10): todos, con
 * precio o sin él, activos e inactivos, y con la cantidad de clientes que
 * tiene cada uno.
 *
 * El conteo sale de una consulta aparte y no de un `select` embebido porque
 * PostgREST sólo sabe contar relaciones con `count` agregado sobre el embed,
 * y eso obliga a traer las filas de `customer_membership`. Son ~600 y sólo
 * queremos el número por tipo, así que se agrega en memoria sobre una lista de
 * claves — una columna, sin joins.
 */
export async function getMembershipPlans() {
  const supabase = await createClient()

  const [{ data: types, error: typesError }, { data: memberships, error: countError }] =
    await Promise.all([
      getMembershipTypes({ includeUnpriced: true, includeInactive: true }),
      supabase.from('customer_membership').select('membership_type'),
    ])

  if (typesError || countError) {
    // eslint-disable-next-line no-console
    console.error('Error fetching membership plans:', typesError ?? countError)

    return { data: [] as MembershipPlan[], error: typesError ?? countError }
  }

  const countByType = new Map<string, number>()

  for (const row of memberships ?? []) {
    const key = row.membership_type

    if (key) countByType.set(key, (countByType.get(key) ?? 0) + 1)
  }

  const plans: MembershipPlan[] = types.map((plan) => ({
    ...plan,
    customer_count: countByType.get(plan.type) ?? 0,
  }))

  return { data: plans, error: null }
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
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('types_memberships')
    .update(prices)
    .eq('id', membershipId)
    .select(MEMBERSHIP_TYPE_COLUMNS)
    .single()

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error updating membership prices:', error)

    return { data: null, error }
  }

  return { data: data as MembershipType, error: null }
}
