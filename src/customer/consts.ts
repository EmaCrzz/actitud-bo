
export const SEARCH_CUSTOMER = `
  id,
  first_name,
  last_name,
  person_id,
  email,
  phone,
  created_at,
  assistance_count,
  "customer_membership" (membership_type)
` as const
export const SEARCH_CUSTOMER_WITH_ASSISTANCE = `
  id,
  first_name,
  last_name,
  person_id,
  email,
  phone,
  created_at,
  assistance_count,
  "customer_membership" (membership_type),
  "assistance" (assistance_date)
` as const
