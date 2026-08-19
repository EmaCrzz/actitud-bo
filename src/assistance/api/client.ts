import { createClient } from '@/lib/supabase/client'
import { withRateLimit } from '@/lib/rate-limit'
import { getWeekRangeInAppTz } from '@/lib/timezone'
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
