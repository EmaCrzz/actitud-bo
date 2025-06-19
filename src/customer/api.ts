import { createClient } from "@/lib/supabase/client";
import { SEARCH_CUSTOMER } from "@/customer/consts";
import { Customer } from "./types";

export const searchCustomer = async (query?: string) => {
  if (!query) return []
  const supabase = createClient();
  const { data } = await supabase
    .from('customers')
    .select(SEARCH_CUSTOMER)
    .ilike('first_name', `%${query}%`)
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

export const searchAllCustomers = async () => {
  const supabase = createClient();
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