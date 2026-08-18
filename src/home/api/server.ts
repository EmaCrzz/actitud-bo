import { createClient } from '@/lib/supabase/server'
import { getDayRangeInAppTz, getTodayRangeInAppTz } from '@/lib/timezone'
import { UPCOMING_EXPIRATION_WINDOW_DAYS } from '@/home/consts'
import type { HomeMetrics } from '@/home/types'

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

// Membresías cuya expiration_date ya pasó (disjoint con active).
async function getExpiredMembershipsCount(): Promise<number> {
  const supabase = await createClient()
  const { start: todayStart } = getTodayRangeInAppTz()

  const { count } = await supabase
    .from('customer_membership')
    .select('*', { count: 'exact', head: true })
    .lt('expiration_date', todayStart.toISOString())

  return count ?? 0
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
