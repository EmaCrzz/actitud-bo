/* eslint-disable no-console */
import { createClient } from '@/lib/supabase/server'

export const getTotalAssistancesToday = async () => {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { count } = await supabase
    .from('assistance')
    .select('*', { count: 'exact', head: true })
    .gte('assistance_date', `${today}T00:00:00.000Z`)
    .lt('assistance_date', `${tomorrow}T00:00:00.000Z`)

  return count || 0
}

// Tipo para el resultado
interface AssistanceByDate {
  id: string
  assistance_date: string
  customers: {
    first_name: string
    last_name: string
    person_id: string
    phone: string | null
    email: string | null
    id: string
  }
}

// Función para obtener todas las asistencias de una fecha específica
export async function getAssistancesByDate(date: Date): Promise<AssistanceByDate[]> {
  // Crear el rango de la fecha (desde 00:00:00 hasta 23:59:59)
  const supabase = await createClient()
  const startOfDay = new Date(date)

  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(date)

  endOfDay.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from('assistance')
    .select(
      `
      id,
      assistance_date,
      customers (
        id,
        first_name,
        last_name,
        person_id,
        phone,
        email
      )
    `
    )
    .gte('assistance_date', startOfDay.toISOString())
    .lte('assistance_date', endOfDay.toISOString())
    .order('assistance_date', { ascending: false })

  const assistances = data as unknown as AssistanceByDate[]

  if (error) {
    console.error('Error fetching assistances by date:', error)

    return []
  }

  return assistances
}

// Función para obtener asistencias de hoy (caso específico)
export async function getTodayAssistances() {
  return getAssistancesByDate(new Date())
}

// Función para obtener asistencias de una semana
export async function getAssistancesByWeek(startDate: Date, endDate: Date) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assistance')
    .select(
      `
      id,
      assistance_date,
      customers (
        id,
        first_name,
        last_name,
        person_id,
        phone,
        email
      )
    `
    )
    .gte('assistance_date', startDate.toISOString())
    .lte('assistance_date', endDate.toISOString())
    .order('assistance_date', { ascending: false })

  if (error) {
    console.error('Error fetching assistances by week:', error)

    return []
  }

  return data || []
}

// Función para obtener el top 10 de clientes del mes (via RPC)
export async function getTopCustomersThisMonthRPC() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_top_customers_current_month', { limit_count: 5 })

  if (error) {
    console.error('Error fetching top customers:', error)

    return { data: null, error }
  }

  return { data: data as unknown as TopCustomer[], error: null }
}

// Tipo TypeScript para el resultado
export interface TopCustomer {
  id: string
  first_name: string
  last_name: string
  person_id: string
  phone: string | null
  email: string | null
  assistance_count: number
  monthly_assistance_count: number
}
