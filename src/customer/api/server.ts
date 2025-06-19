
import { SEARCH_CUSTOMER } from "@/customer/consts";
import { Customer } from "@/customer/types";
import { createClient } from "@/lib/supabase/server";

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
  const { data } = await supabase
    .from('customers')
    .select(SEARCH_CUSTOMER)
    .eq('id', id)

  if (!data || data.length === 0) {
    return { customer: null };
  }

  const customer: Customer = {
    ...data[0],
    membership_type: data[0].customer_membership?.[0]?.membership_type || null,
  }

  return { customer }
}