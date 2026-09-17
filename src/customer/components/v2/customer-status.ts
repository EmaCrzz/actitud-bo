import type { StatusTone } from '@/components/v2/ui/StatusBadge'
import type { CustomerMembershipStatus } from '@/customer/utils'
import type { TranslationKey } from '@/lib/i18n/types'

/**
 * Cómo se pinta cada estado derivado de la membresía.
 *
 * Vive en un módulo propio porque lo consumen la fila del listado y la card del
 * Perfil, y el Figma los dibuja idénticos: si el badge del panel dijera otra
 * cosa que el de la fila que lo abrió, se vería como un bug aunque los datos
 * fueran los mismos.
 *
 * Los colores salen del dropdown `Estado` del Figma (captura del 2026-09-16):
 * verde Activo · amarillo Por vencer · rojo Vencido. "Sin membresía" no está en
 * ese dropdown — es el badge neutro de los clientes sin fila en
 * `customer_membership`.
 */
export const CUSTOMER_STATUS_TONE: Record<CustomerMembershipStatus, StatusTone> = {
  active: 'success',
  expiring: 'warning',
  expired: 'danger',
  none: 'neutral',
}

export const CUSTOMER_STATUS_LABEL: Record<CustomerMembershipStatus, TranslationKey> = {
  active: 'v2.customers.status.active',
  expiring: 'v2.customers.status.expiring',
  expired: 'v2.customers.status.expired',
  none: 'v2.customers.status.none',
}
