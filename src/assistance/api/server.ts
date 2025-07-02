/* eslint-disable no-console */
import { createClient } from "@/lib/supabase/server";

export const getTotalAssistancesToday = async () => {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { count } = await supabase
    .from('assistance')
    .select('*', { count: 'exact', head: true })
    .gte('assistance_date', `${today}T00:00:00.000Z`)
    .lt('assistance_date', `${tomorrow}T00:00:00.000Z`)

  return count || 0;
}

// export const getTotalAssistancesTodayWithClients = async () => {
//   const supabase = await createClient();
//   const { data, error } = await supabase
//     .from("assistance")
//     .select(`
//       id,
//       assistance_date,
//       customers (
//         first_name,
//         last_name,
//         person_id,
//         phone,
//         email
//       )
//     `)
//     .gte("assistance_date", new Date().toISOString().split("T")[0]) // Desde hoy 00:00
//     .lt("assistance_date", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]) // Hasta mañana 00:00
//     .order("assistance_date", { ascending: false })

//   if (error) {
//     console.error("Error fetching today assistances:", error)
//     return { data: [], count: 0 }
//   }

//   return { data, count: data.length }
// }


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
  const supabase = await createClient();
  const startOfDay = new Date(date)

  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(date)

  endOfDay.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from("assistance")
    .select(`
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
    `)
    .gte("assistance_date", startOfDay.toISOString())
    .lte("assistance_date", endOfDay.toISOString())
    .order("assistance_date", { ascending: false })

  const assistances = data as unknown as AssistanceByDate[]

  if (error) {
    console.error("Error fetching assistances by date:", error)

    return []
  }

  return assistances
}

// Función para obtener estadísticas de asistencias por fecha
// export async function getAssistanceStatsByDate(date: Date) {
//   const assistances = await getAssistancesByDate(date)
//   const uniqueCustomers = await getUniqueCustomersByDate(date)

//   return {
//     totalAssistances: assistances.length,
//     uniqueCustomers: uniqueCustomers.length,
//     assistances: assistances,
//     customers: uniqueCustomers.map((a) => a.customers),
//   }
// }

// Función para obtener asistencias de hoy (caso específico)
export async function getTodayAssistances() {
  return getAssistancesByDate(new Date())
}

// Función para obtener asistencias de una semana
export async function getAssistancesByWeek(startDate: Date, endDate: Date) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assistance")
    .select(`
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
    `)
    .gte("assistance_date", startDate.toISOString())
    .lte("assistance_date", endDate.toISOString())
    .order("assistance_date", { ascending: false })

  if (error) {
    console.error("Error fetching assistances by week:", error)

    return []
  }

  return data || []
}

// // Función para obtener el top 10 de clientes del mes
// export async function getTop10CustomersThisMonth() {
//   // Obtener el primer día del mes actual
//   const now = new Date()
//   const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
//   const firstDayOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

//   const { data, error } = await supabase
//     .from('assistance')
//     .select(`
//       customer_id,
//       customers (
//         id,
//         first_name,
//         last_name,
//         person_id,
//         phone,
//         email,
//         assistance_count
//       )
//     `)
//     .gte('assistance_date', firstDayOfMonth.toISOString())
//     .lt('assistance_date', firstDayOfNextMonth.toISOString())

//   if (error) {
//     console.error('Error fetching monthly assistance data:', error)
//     return { data: null, error }
//   }

//   // Procesar los datos para contar asistencias por cliente
//   const customerAssistanceMap = new Map()
  
//   data?.forEach((assistance) => {
//     const customerId = assistance.customer_id
//     const customer = assistance.customers
    
//     if (customerAssistanceMap.has(customerId)) {
//       customerAssistanceMap.get(customerId).monthly_assistance_count++
//     } else {
//       customerAssistanceMap.set(customerId, {
//         ...customer,
//         monthly_assistance_count: 1
//       })
//     }
//   })

//   // Convertir a array y ordenar por asistencias del mes
//   const topCustomers = Array.from(customerAssistanceMap.values())
//     .sort((a, b) => b.monthly_assistance_count - a.monthly_assistance_count)
//     .slice(0, 10)

//   return { data: topCustomers, error: null }
// }

// Función para obtener el top 10 de clientes del mes
export async function getTop10CustomersThisMonthRPC() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('get_top_customers_current_month', { limit_count: 10 })

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