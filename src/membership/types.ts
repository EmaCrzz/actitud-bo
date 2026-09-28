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
  /**
   * Nombre visible, sólo en los planes creados desde la UI. NULL en los 5 del
   * catálogo original, que resuelven por key i18n. No leer directo: usar
   * `getMembershipLabel()` de `membership/catalog.ts`.
   */
  name: string | null
  /** Días por semana. NULL si el plan no lo tiene cargado. */
  weekly_quota: number | null
  active: boolean
}

/**
 * Un plan con el dato que la tabla de la Fase 10 muestra y la tabla de precios
 * no tiene: cuántos clientes lo usan hoy.
 *
 * Va separado de `MembershipType` porque el conteo no es una columna sino una
 * agregación sobre `customer_membership`, y arrastrarlo en el tipo base
 * obligaría a todas las pantallas que sólo quieren precios a pagar el join.
 */
export interface MembershipPlan extends MembershipType {
  customer_count: number
}
