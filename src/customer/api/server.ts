
import { SEARCH_CUSTOMER } from "@/customer/consts";
import { Customer, CustomerComplete, CustomerMembership, CustomerWithMembership } from "@/customer/types";
import { createClient } from "@/lib/supabase/server";
import { getWeekRange } from "@/lib/week";

export const searchAllCustomers = async (): Promise<CustomerWithMembership[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('customers')
    .select(SEARCH_CUSTOMER)
    .order('first_name', {
      ascending: true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as unknown as { data: any[] }; // TODO fix this

  const customers = data?.map((customer) => {
    const membership_type = customer.customer_membership?.membership_type || null;

    return ({
      ...customer,
      membership_type,
    })
  }) || [];

  return customers;
}

export const searchCustomersById = async (id: string): Promise<CustomerComplete | null> => {
  const supabase = await createClient();
  // Consulta 1: Datos básicos del cliente
  const { data: customer, error: customerError } = await supabase.from("customers").select("*").eq("id", id).single()

  if (customerError || !customer) {
    return null
  }

  const week = getWeekRange()
  // Consulta 2: Membresía (sabemos que es única)
  const { data: membership } = await supabase
    .from("customer_membership")
    .select("membership_type, expiration_date")
    .eq("customer_id", id)
    .single()

  // Consulta 3: Asistencias de la semana
  const { data: assistances } = await supabase
    .from("assistance")
    .select("assistance_date")
    .eq("customer_id", id)
    .gte("assistance_date", week.start.toISOString())
    .lte("assistance_date", week.end.toISOString())
    .order("assistance_date", { ascending: true })

  return {
    ...customer,
    customer_membership: membership || null,
    assistance: assistances || [],
  }
}

// Función auxiliar para obtener solo los datos básicos del cliente
export async function getCustomerBasic(id: string): Promise<Customer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("customers").select("*").eq("id", id).single()

  if (error || !data) return null

  return data as Customer
}

// Función auxiliar para obtener solo la membresía
export async function getCustomerMembership(customerId: string): Promise<CustomerMembership | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_membership")
    .select("membership_type")
    .eq("customer_id", customerId)
    .single()

  if (error || !data) {
    return null
  }

  return data as CustomerMembership
}


// export async function deleteCustomer(customerId: string) {
//   const supabase = await createClient()

//   try {
//     const { error } = await supabase.from("customers").delete().eq("id", customerId)

//     if (error) {
//       throw new Error(error.message)
//     }

//     // revalidatePath("/customers")
//     // redirect("/customers")
//   } catch (error) {
//     console.error("Error deleting customer:", error)
//     throw new Error("Error al eliminar el cliente")
//   }
// }
