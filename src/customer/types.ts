import { MembershipType } from "@/assistance/consts";
export interface Customer {
  id: string
  created_at: string
  first_name: string
  last_name: string
  person_id: string
  phone: string | null
  email: string | null
  assistance_count: number
}
export interface CustomerWithMembership extends Customer {
  membership_type: MembershipType | null
}

export interface CustomerMembership {
  membership_type: MembershipType
}

export interface Assistance {
  assistance_date: string
}

// Tipo combinado para el resultado final
export interface CustomerComplete extends Customer {
  customer_membership: CustomerMembership | null
  assistance: Assistance[]
}
