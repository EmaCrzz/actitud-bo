import { createClient } from "@/lib/supabase/server";
import { ActiveMembership } from "@/membership/types";

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