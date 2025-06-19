import { createClient } from "@/lib/supabase/client";

interface CreateAssistanceParams {
  customer_id: string
}

export const createAssistance = async ({ customer_id }: CreateAssistanceParams) => {
  if (!customer_id) throw new Error("Customer ID is required");

  const supabase = createClient();
  const { error, data } = await supabase
    .from('assistance')
    .insert({ customer_id })

  return { error, data }
}
