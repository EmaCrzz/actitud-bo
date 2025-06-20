
import { SEARCH_CUSTOMER, SEARCH_CUSTOMER_WITH_ASSISTANCE } from "@/customer/consts";
import { Customer, CustomerWithAssistance } from "@/customer/types";
import { createClient } from "@/lib/supabase/server";
import { getWeekRange } from "@/lib/week";
// import { revalidatePath } from "next/cache"
// import { redirect } from "next/navigation"

export const searchAllCustomers = async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('customers')
    .select(SEARCH_CUSTOMER)
    .order('first_name', {
      ascending: true
    })

  const customers: Customer[] = data?.map((customer) => {
    const membership_type = customer.customer_membership?.[0]?.membership_type || null;
    return ({
      ...customer,
      membership_type,
    })
  }) || [];
  return customers;
}

export const searchCustomersById = async (id: string) => {
  const supabase = await createClient();
  const week = getWeekRange()
  const { data } = await supabase
    .from('customers')
    .select(SEARCH_CUSTOMER_WITH_ASSISTANCE)
    .eq('id', id)
    .gte('assistance.assistance_date', week.start.toISOString())
    .lte('assistance.assistance_date', week.end.toISOString())

  if (!data || data.length === 0) {
    return { customer: null };
  }

  const customer: CustomerWithAssistance = {
    ...data[0],
    membership_type: data[0].customer_membership?.[0]?.membership_type || null,
  }

  return { customer }
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
