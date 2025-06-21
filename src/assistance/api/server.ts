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

export const getTotalAssistancesTodayWithClients = async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assistance")
    .select(`
      id,
      assistance_date,
      customers (
        first_name,
        last_name,
        person_id,
        phone,
        email
      )
    `)
    .gte("assistance_date", new Date().toISOString().split("T")[0]) // Desde hoy 00:00
    .lt("assistance_date", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]) // Hasta mañana 00:00
    .order("assistance_date", { ascending: false })

  if (error) {
    console.error("Error fetching today assistances:", error)
    return { data: [], count: 0 }
  }
  
  return { data, count: data.length }
}