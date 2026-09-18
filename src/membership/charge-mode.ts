import type { TranslationKey } from '@/lib/i18n/types'
import { MEMBERSHIP_TYPE_DAILY, MEMBERSHIP_TYPE_VIP } from '@/membership/consts'
import type { MembershipType } from '@/membership/types'

/**
 * "Modalidad de cobro" — cuál de los tres precios del plan se cobra.
 *
 * `types_memberships` guarda tres montos por plan y el operador elige cuál
 * aplica: el mes completo, la media membresía de quien entra a mitad de mes, o
 * el mes con recargo de quien paga tarde. La política de fechas que sugiere cuál
 * corresponde vive en [src/accounting/billing-policy.ts]; acá sólo está el
 * catálogo de opciones y su precio.
 *
 * Vivía inline en `customer/membership-form.tsx` (v1). Se extrajo al arrancar la
 * Fase 7 de la v2, cuando el alta pasó a ofrecer el mismo select: dos
 * formularios calculando por su cuenta qué opciones existen y a qué precio es
 * exactamente cómo terminan cobrando distinto por el mismo plan.
 */
export type ChargeMode = 'full' | 'half' | 'surcharge'

export interface ChargeModeOption {
  mode: ChargeMode
  /** Clave i18n de la etiqueta — "Mes completo", "Medio mes / quincena", … */
  labelKey: TranslationKey
  amount: number
}

const CHARGE_MODE_LABEL: Record<ChargeMode, TranslationKey> = {
  full: 'membership.chargeModeFull',
  half: 'membership.chargeModeHalf',
  surcharge: 'membership.chargeModeSurcharge',
}

/**
 * Opciones de cobro disponibles para un plan.
 *
 * Devuelve `[]` para Diaria y VIP, que no tienen modalidades: la diaria se cobra
 * a precio único y la VIP no se cobra. Ambos planes tienen `middle_amount` y
 * `amount_surcharge` en 0 — no en NULL — así que filtrar sólo por nulos
 * ofrecería "media membresía de $0", que no es una opción real. El corte va por
 * tipo de plan, no por el valor de la columna.
 */
export function getChargeModeOptions(
  membership: MembershipType | null | undefined
): ChargeModeOption[] {
  if (!membership) return []
  if (membership.type === MEMBERSHIP_TYPE_VIP || membership.type === MEMBERSHIP_TYPE_DAILY) {
    return []
  }

  const amounts: Record<ChargeMode, number | null> = {
    full: membership.amount,
    half: membership.middle_amount,
    surcharge: membership.amount_surcharge,
  }

  return (Object.keys(amounts) as ChargeMode[])
    .filter((mode) => amounts[mode] !== null)
    .map((mode) => ({ mode, labelKey: CHARGE_MODE_LABEL[mode], amount: amounts[mode] as number }))
}

/**
 * Monto a cobrar por un plan según la modalidad elegida.
 *
 * Cae al precio de lista (`amount`) cuando la modalidad pedida no tiene precio
 * cargado, que es el mismo comportamiento que tenía v1: es preferible cobrar el
 * monto completo que cobrar 0 por un campo sin llenar.
 */
export function getChargeAmount(
  membership: MembershipType | null | undefined,
  mode: ChargeMode
): number {
  if (!membership) return 0
  if (mode === 'half' && membership.middle_amount !== null) return membership.middle_amount
  if (mode === 'surcharge' && membership.amount_surcharge !== null) {
    return membership.amount_surcharge
  }

  return membership.amount ?? 0
}
