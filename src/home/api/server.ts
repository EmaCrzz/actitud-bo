import { createClient } from '@/lib/supabase/server'
import {
  getDayRangeInAppTz,
  getMonthRangeInAppTz,
  getTodayIsoDateInAppTz,
  getTodayRangeInAppTz,
  getWeekRangeInAppTz,
  parseAppTzDateString,
  shiftIsoDateInAppTz,
} from '@/lib/timezone'
import { UPCOMING_EXPIRATION_WINDOW_DAYS } from '@/home/consts'
import { MEMBERSHIP_TYPE_DAILY, MEMBERSHIP_TYPE_VIP } from '@/membership/consts'
import type { DailySummary, HomeMetrics, WeeklyAttendance } from '@/home/types'

// Espejo de la misma constante en accounting/api/incomes.ts. VIP no cobra
// periódicamente; DAILY es pase único que no genera deuda al no renovar.
const CYCLE_EXCLUDED_MEMBERSHIP_TYPES = [MEMBERSHIP_TYPE_VIP, MEMBERSHIP_TYPE_DAILY]

// Count de asistencias registradas en el rango del día AR de la fecha dada.
// Head-only query (no trae rows), solo el count exacto.
async function getAssistancesCountForDay(date: Date): Promise<number> {
  const supabase = await createClient()
  const { start, end } = getDayRangeInAppTz(date)

  const { count } = await supabase
    .from('assistance')
    .select('*', { count: 'exact', head: true })
    .gte('assistance_date', start.toISOString())
    .lt('assistance_date', end.toISOString())

  return count ?? 0
}

// Membresías con expiration_date >= inicio día AR de hoy. Coincide con la
// definición usada por getActiveMemberships en el dominio membership.
async function getActiveMembershipsCount(): Promise<number> {
  const supabase = await createClient()
  const { start: todayStart } = getTodayRangeInAppTz()

  const { count } = await supabase
    .from('customer_membership')
    .select('*', { count: 'exact', head: true })
    .gte('expiration_date', todayStart.toISOString())

  return count ?? 0
}

// Membresías activas que vencen dentro de la ventana de aviso (subset del count activo).
async function getUpcomingExpirationsCount(windowDays: number): Promise<number> {
  const supabase = await createClient()
  const { start: todayStart } = getTodayRangeInAppTz()
  const windowEnd = new Date(todayStart)

  windowEnd.setUTCDate(windowEnd.getUTCDate() + windowDays)

  const { count } = await supabase
    .from('customer_membership')
    .select('*', { count: 'exact', head: true })
    .gte('expiration_date', todayStart.toISOString())
    .lt('expiration_date', windowEnd.toISOString())

  return count ?? 0
}

// Membresías vencidas restringidas a socios con señal de vida en el mes actual
// (al menos una asistencia). Excluye VIP y DAILY. Alinea con el denominador de
// getBillingCycleProgress en accounting: evita contar churn histórico acumulado.
async function getExpiredMembershipsCount(): Promise<number> {
  const supabase = await createClient()
  const { start: monthStart, end: monthEnd } = getMonthRangeInAppTz()
  const { start: todayStart } = getTodayRangeInAppTz()

  const { data: attendances } = await supabase
    .from('assistance')
    .select('customer_id')
    .gte('assistance_date', monthStart.toISOString())
    .lt('assistance_date', monthEnd.toISOString())

  const activeIds = [...new Set((attendances ?? []).map((a) => a.customer_id))]
  if (activeIds.length === 0) return 0

  const { count } = await supabase
    .from('customer_membership')
    .select('*', { count: 'exact', head: true })
    .in('customer_id', activeIds)
    .lt('expiration_date', todayStart.toISOString())
    .not('membership_type', 'in', `(${CYCLE_EXCLUDED_MEMBERSHIP_TYPES.join(',')})`)

  return count ?? 0
}

// Resumen de actividad del día para el card "Resumen del día".
// Las 4 sub-queries se lanzan en paralelo; getAttendancesWithExpiredMembership
// tiene dos queries secuenciales internas porque no hay FK directa entre
// assistance y customer_membership (ambas apuntan a customers).
export async function getDailySummary(): Promise<DailySummary> {
  const supabase = await createClient()
  const { start, end } = getTodayRangeInAppTz()

  const getAttendancesWithExpiredMembership = async () => {
    const { data } = await supabase
      .from('assistance')
      .select('customer_id')
      .gte('assistance_date', start.toISOString())
      .lt('assistance_date', end.toISOString())

    const ids = data?.map((r) => r.customer_id) ?? []
    if (ids.length === 0) return 0

    const { count } = await supabase
      .from('customer_membership')
      .select('*', { count: 'exact', head: true })
      .in('customer_id', ids)
      .lt('expiration_date', start.toISOString())

    return count ?? 0
  }

  const getPaymentsRegistered = async () => {
    const { count } = await supabase
      .from('membership_payments')
      .select('*', { count: 'exact', head: true })
      .gte('payment_date', start.toISOString())
      .lt('payment_date', end.toISOString())
    return count ?? 0
  }

  const getNewCustomers = async () => {
    const { count } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
    return count ?? 0
  }

  const getGroupsCreated = async () => {
    const { count } = await supabase
      .from('customer_groups')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
    return count ?? 0
  }

  const [attendancesWithExpiredMembership, paymentsRegistered, newCustomers, groupsCreated] =
    await Promise.all([
      getAttendancesWithExpiredMembership(),
      getPaymentsRegistered(),
      getNewCustomers(),
      getGroupsCreated(),
    ])

  return { attendancesWithExpiredMembership, paymentsRegistered, newCustomers, groupsCreated }
}

// Asistencias por día para Lun-Vie de la semana actual. Usa getWeekRangeInAppTz
// para determinar el lunes AR y shiftIsoDateInAppTz para navegar día a día
// sin drift de DST (AR no observa DST pero el helper es robusto igual).
export async function getWeeklyAttendanceSummary(): Promise<WeeklyAttendance> {
  const { start: weekStart } = getWeekRangeInAppTz()
  const monIso = getTodayIsoDateInAppTz(weekStart)
  const isos = Array.from({ length: 5 }, (_, i) => shiftIsoDateInAppTz(monIso, i))
  const counts = await Promise.all(isos.map((iso) => getAssistancesCountForDay(parseAppTzDateString(iso))))

  return isos.map((isoDate, i) => ({ isoDate, count: counts[i] }))
}

// Agrega todas las métricas del dashboard en un solo await.
// Todas las queries son independientes → Promise.all las corre en paralelo
// (regla vercel `async-parallel`).
export async function getHomeMetrics(): Promise<HomeMetrics> {
  const today = new Date()
  const lastWeekSameDay = new Date(today)

  lastWeekSameDay.setUTCDate(lastWeekSameDay.getUTCDate() - 7)

  const [todayCount, lastWeekCount, activeCount, upcomingExpirationsCount, expiredCount] =
    await Promise.all([
      getAssistancesCountForDay(today),
      getAssistancesCountForDay(lastWeekSameDay),
      getActiveMembershipsCount(),
      getUpcomingExpirationsCount(UPCOMING_EXPIRATION_WINDOW_DAYS),
      getExpiredMembershipsCount(),
    ])

  // Sin referencia previa (0 asistencias el mismo día semana pasada) → la
  // comparativa "+X" no tiene sentido; devolvemos null para que la UI muestre
  // fallback distinto (solo el count actual, sin delta).
  const deltaVsLastWeek = lastWeekCount === 0 && todayCount === 0 ? null : todayCount - lastWeekCount

  return {
    todayCount,
    deltaVsLastWeek,
    activeCount,
    upcomingExpirationsCount,
    expiredCount,
  }
}
