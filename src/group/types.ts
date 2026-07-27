import { MembershipTypes } from '@/membership/consts'
import { DiscountAppliesTo, DiscountType, GroupType } from './consts'

export interface CustomerGroup {
  id: string
  type: GroupType
  name: string
  created_at: string
  updated_at: string
}

export interface CustomerGroupMember {
  id: string
  group_id: string
  customer_id: string
  joined_at: string
  left_at: string | null
}

// Resumen de un integrante para renderizar en el detalle del grupo.
export interface GroupMemberSummary {
  member_id: string
  customer_id: string
  first_name: string
  last_name: string
  joined_at: string
  membership_type: MembershipTypes | null
  expiration_date: string | null
  is_expired: boolean
}

// Grupo con conteo de miembros activos (para el listado).
export interface CustomerGroupWithCount extends CustomerGroup {
  active_members_count: number
}

// Grupo con detalle completo de miembros (para la pantalla de detalle).
export interface CustomerGroupWithMembers extends CustomerGroup {
  members: GroupMemberSummary[]
}

export interface DiscountRule {
  id: string
  name: string
  type: DiscountType
  value: number
  applies_to: DiscountAppliesTo
  active: boolean
  created_at: string
  updated_at: string
}

// Descuento aplicable computado por el server: la regla + el monto sugerido
// materializado (para reglas percent, ya calculado sobre el bruto vigente
// del tipo de membresía del cliente; para fixed, es directamente el value).
// Se devuelve como `null` cuando ninguna regla aplica al cliente.
export interface ApplicableDiscount {
  rule: DiscountRule
  group: {
    id: string
    name: string
    active_members_count: number
  }
  suggested_amount: number
}
