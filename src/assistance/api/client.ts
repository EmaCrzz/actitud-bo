import { createClient } from '@/lib/supabase/client'
import { withRateLimit } from '@/lib/rate-limit'
import { getMonthRangeInAppTz, getWeekRangeInAppTz } from '@/lib/timezone'
import type { MembershipTypes } from '@/membership/consts'

interface CreateAssistanceParams {
  customer_id: string
}

async function _createAssistance({ customer_id }: CreateAssistanceParams) {
  if (!customer_id) throw new Error('Customer ID is required')

  const supabase = createClient()
  const { error, data } = await supabase.from('assistance').insert({ customer_id })

  return { error, data }
}

export const createAssistance = withRateLimit('assistance', _createAssistance)

export interface CustomerModalData {
  membership: {
    type: MembershipTypes
    expiration_date: string | null
  } | null
  weeklyAssistances: Array<{ assistance_date: string }>
}

// Fetch ligero para el modal de asistencia: membresía del cliente + asistencias
// de la semana actual. Se llama una sola vez al abrir el modal (no necesita
// rate limiting — no es un input de alta frecuencia).
export async function fetchCustomerModalData(customerId: string): Promise<CustomerModalData> {
  const supabase = createClient()
  const { start, end } = getWeekRangeInAppTz()

  const [{ data: membershipData }, { data: assistancesData }] = await Promise.all([
    supabase
      .from('customer_membership')
      .select('membership_type, expiration_date')
      .eq('customer_id', customerId)
      .maybeSingle(),
    supabase
      .from('assistance')
      .select('assistance_date')
      .eq('customer_id', customerId)
      .gte('assistance_date', start.toISOString())
      .lt('assistance_date', end.toISOString())
      .order('assistance_date', { ascending: true }),
  ])

  return {
    membership: membershipData
      ? {
          type: membershipData.membership_type as MembershipTypes,
          expiration_date: membershipData.expiration_date,
        }
      : null,
    weeklyAssistances: (assistancesData ?? []).map((a) => ({ assistance_date: a.assistance_date })),
  }
}

export interface CustomerAssistanceHistory {
  assistances: Array<{ id: string; assistance_date: string }>
  /** Total histórico. El Figma lo muestra al pie del tab como "Total: N". */
  total: number
  /** Asistencias del mes contable en curso. Al pie, como "Último mes: N". */
  currentMonth: number
}

/**
 * Historial de asistencias de un cliente, para el tab "Asistencias" del Perfil
 * (Fase 6b). Es el único endpoint que la fase tuvo que agregar: hasta ahora el
 * dominio sólo sabía consultar asistencias **por fecha**
 * (`getAssistancesByDate`) o **de la semana en curso**
 * (`fetchCustomerModalData`), nunca el historial completo de una persona.
 *
 * Los dos contadores salen de queries `head: true`, que traen sólo el count sin
 * las filas: el pie del tab necesita el total histórico aunque la lista muestre
 * una página.
 *
 * "Último mes" es el mes contable en curso en Argentina, no los últimos 30 días
 * — `getMonthRangeInAppTz` es el mismo helper que usan el dashboard y los KPIs,
 * así que el número del perfil cuadra con el resto de la app.
 */
export async function fetchCustomerAssistances(
  customerId: string,
  { limit, offset = 0 }: { limit: number; offset?: number }
): Promise<CustomerAssistanceHistory> {
  const supabase = createClient()
  const { start, end } = getMonthRangeInAppTz()

  const [{ data, count, error }, { count: monthCount }] = await Promise.all([
    supabase
      .from('assistance')
      .select('id, assistance_date', { count: 'exact' })
      .eq('customer_id', customerId)
      .order('assistance_date', { ascending: false })
      .range(offset, offset + limit - 1),
    supabase
      .from('assistance')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .gte('assistance_date', start.toISOString())
      .lt('assistance_date', end.toISOString()),
  ])

  if (error) throw error

  return {
    assistances: (data ?? []).map((row) => ({
      id: row.id,
      assistance_date: row.assistance_date,
    })),
    total: count ?? 0,
    currentMonth: monthCount ?? 0,
  }
}
