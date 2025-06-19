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