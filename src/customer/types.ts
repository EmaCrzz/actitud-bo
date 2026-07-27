import { MembershipTypes } from '@/membership/consts'
import { MembershipData } from '@/membership/types'
import type { DatabaseSuccess, DatabaseError } from '@/types/database-errors'
import type { ApplicableDiscount, CustomerGroupWithCount } from '@/group/types'

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
  membership_type: MembershipTypes | null
}

export interface CustomerMembership {
  membership_type: MembershipTypes
  expiration_date: string | null
  last_payment_date: string | null
  renewal_date: string | null
}

export interface Assistance {
  assistance_date: string
}

// Tipo combinado para el resultado final
export interface CustomerComplete extends Customer {
  customer_membership: CustomerMembership | null
  assistance: Assistance[]
  // Forma de pago del último pago registrado (viene de membership_payments,
  // no de customer_membership). Null si el cliente nunca registró un pago (ej. VIP).
  last_payment_method: string | null
  // Grupos activos a los que pertenece, con conteo de integrantes activos.
  // Vacío si no pertenece a ningún grupo.
  groups: CustomerGroupWithCount[]
  // Descuento sugerido para la próxima renovación si la regla aplica.
  // Null si no hay regla aplicable (cliente sin grupo, o grupo con < 2 miembros).
  applicable_discount: ApplicableDiscount | null
}

// Tipos específicos para el formulario de cliente
export interface CustomerData {
  id: string
  first_name: string
  last_name: string
  person_id: string
  phone?: string
  email?: string
  assistance_count: number
  created_at: string
}

export interface CustomerSuccessData {
  customer: CustomerData
  membership?: MembershipData
  membership_active: boolean
}

// Errores específicos del formulario
export interface CustomerFormErrors {
  first_name?: string[]
  last_name?: string[]
  person_id?: string[]
  phone?: string[]
  email?: string[]
  membership_type?: string[]
  general?: string[]
}

// Respuesta exitosa del formulario
export interface CustomerFormSuccess extends DatabaseSuccess<CustomerSuccessData> {
  errors?: never
}

// Respuesta de error del formulario
export interface CustomerFormError extends DatabaseError {
  errors?: CustomerFormErrors
}

// Tipo unión para la respuesta del formulario
export type CustomerFormResponse = CustomerFormSuccess | CustomerFormError
