import { Customer } from '@/customer/types'

export interface ActiveMembership {
  id: string
  membership_type: string
  last_payment_date: string | null
  expiration_date: string | null
  created_at: string
  customers: Customer
  types_memberships: {
    type: string
  }
  last_payment?: {
    amount: number
    payment_method: string
    payment_date: string
  } | null
}

export interface MembershipData {
  id: string
  customer_id: string
  membership_type: string
  last_payment_date?: string
  expiration_date?: string
  created_at: string
}

export interface MembershipType {
  id: string
  type: string
  amount: number | null
  amount_surcharge: number | null
  middle_amount: number | null
  last_update: string | null
}
