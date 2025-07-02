import { Customer } from "@/customer/types"

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

export interface MembershipData {
  id: string
  customer_id: string
  membership_type: string
  last_payment_date?: string
  expiration_date?: string
  created_at: string
}