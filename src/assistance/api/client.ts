import { createClient } from "@/lib/supabase/client";
import { withRateLimit } from "@/lib/rate-limit";

interface CreateAssistanceParams {
  customer_id: string
}

// Función interna sin rate limiting
async function _createAssistance({ customer_id }: CreateAssistanceParams) {
  if (!customer_id) throw new Error("Customer ID is required");

  const supabase = createClient();
  const { error, data } = await supabase
    .from('assistance')
    .insert({ customer_id })

  return { error, data }
}

// Función exportada con rate limiting
export const createAssistance = withRateLimit('assistance', _createAssistance)

