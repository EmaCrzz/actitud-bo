
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
    .select()
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


// Tipo TypeScript para el resultado
export interface ActiveMembership {
  id: string
  membership_type: string
  last_payment_date: string | null
  expiration_date: string
  created_at: string
  customers: Customer
  types_memberships: {
    type: string
  }
}

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
      ),
      types_memberships (
        type
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
