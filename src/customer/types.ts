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
  // Vencimiento de la membresía actual. Null si el cliente no tiene fila en
  // `customer_membership` o la tiene sin fecha. El listado v2 lo usa para el
  // badge de estado, que se deriva con `isExpiredInAppTz` — no hay columna de
  // "activo/inactivo" en `customers`.
  expiration_date: string | null
}

/**
 * Datos que alimentan el panel "Perfil del cliente" (Fase 6b).
 *
 * Es un tipo propio y no una extensión de `Customer` porque `birth_date` y
 * `notes` sólo vienen en el select del perfil (`CUSTOMER_PROFILE`): sumarlas a
 * `Customer` las haría aparecer como presentes en todos los call sites que usan
 * los selects del listado, donde en realidad llegan `undefined`.
 */
export interface CustomerProfile {
  id: string
  first_name: string
  last_name: string
  person_id: string
  phone: string | null
  email: string | null
  birth_date: string | null
  notes: string | null
  assistance_count: number
  created_at: string
  membership_type: MembershipTypes | null
  expiration_date: string | null
  /**
   * Cuándo se cobró el período vigente. **No** es el inicio del período: para
   * eso está `start_date`, y el origen correcto lo resuelve
   * `getMembershipPeriodStart()` ([src/membership/period.ts]). Null para
   * membresías que nunca registraron un pago (VIP).
   */
  last_payment_date: string | null
  /**
   * Inicio del período vigente (brecha B12, migración 20260918120000).
   *
   * Null en todo el histórico anterior a esa migración: se agregó sin backfill
   * a propósito. Leerlo directo da un hueco para la mayoría de los clientes —
   * usar `getMembershipPeriodStart()`, que aplica el fallback a
   * `last_payment_date`.
   */
  start_date: string | null
  /** Precio de lista del plan (`types_memberships.amount`). Null si no tiene plan. */
  membership_amount: number | null
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
