
export const SEARCH_CUSTOMER = `
  id,
  first_name,
  last_name,
  person_id,
  email,
  phone,
  created_at,
  assistance_count,
  customer_membership!inner (membership_type)
` as const
