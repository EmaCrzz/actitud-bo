import { MembershipType } from "@/assistance/consts";

export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  person_id: string;
  email?: string;
  phone?: string;
  membership_type: MembershipType | null;
  created_at: string
  assistance_count: number;
  // membershipExpiration?: Date | null;
}