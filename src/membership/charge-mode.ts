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

/* ===========================================================================
 * Modelo de dos ejes (v2, Fase 8)
 * ===========================================================================
 *
 * `ChargeMode` de arriba mezcla dos preguntas en un solo select:
 *
 *   a) ¿qué porción del mes se cobra?   → mes completo | media membresía
 *   b) ¿hay recargo por mora?            → sí | no
 *
 * Con tres opciones planas (full | half | surcharge) esas dos preguntas no se
 * pueden contestar de forma independiente: no existe "media membresía con
 * recargo", y elegir `surcharge` esconde el monto del recargo dentro de un
 * precio total. El comprobante de pago del rediseño, en cambio, tiene
 * `Modalidad de cobro` y `Recargo` como filas separadas — porque son datos
 * separados.
 *
 * Así que la v2 usa `PeriodMode` para (a) y un monto de recargo explícito para
 * (b). `ChargeMode` y sus dos funciones se dejan intactas: las consume el form
 * de v1 y el alta v2, y migrarlas es un cambio de UI que no toca este archivo.
 *
 * Lo que **no** cambia es el significado de las columnas: `amount_surcharge`
 * sigue siendo el precio total del mes con recargo, tal como está cargado en
 * `types_memberships`. El monto del recargo se deriva de la resta contra
 * `amount` — que es la misma cuenta que el resumen de v1 ya hacía inline.
 */

/** Porción del mes que se cobra. El eje (a) de arriba, sin la mora. */
export type PeriodMode = 'full' | 'half'

export interface PeriodModeOption {
  mode: PeriodMode
  labelKey: TranslationKey
  amount: number
}

const PERIOD_MODE_LABEL: Record<PeriodMode, TranslationKey> = {
  full: 'membership.chargeModeFull',
  half: 'membership.chargeModeHalf',
}

/**
 * Modalidades de cobro reales de un plan: mes completo y —si tiene precio
 * cargado— media membresía.
 *
 * Devuelve `[]` para Diaria y VIP por el mismo motivo que
 * `getChargeModeOptions`: no tienen modalidades, y sus columnas están en 0 en
 * vez de NULL, así que el corte va por tipo de plan y no por el valor.
 */
export function getPeriodModeOptions(
  membership: MembershipType | null | undefined
): PeriodModeOption[] {
  if (!membership) return []
  if (membership.type === MEMBERSHIP_TYPE_VIP || membership.type === MEMBERSHIP_TYPE_DAILY) {
    return []
  }

  const amounts: Record<PeriodMode, number | null> = {
    full: membership.amount,
    half: membership.middle_amount,
  }

  return (Object.keys(amounts) as PeriodMode[])
    .filter((mode) => amounts[mode] !== null)
    .map((mode) => ({ mode, labelKey: PERIOD_MODE_LABEL[mode], amount: amounts[mode] as number }))
}

/**
 * Precio base del plan según la porción del mes, **sin recargo ni descuento**.
 *
 * Cae al precio de lista cuando la media membresía no tiene precio cargado,
 * igual que `getChargeAmount`: cobrar el mes completo es un error recuperable,
 * cobrar 0 no.
 */
export function getPeriodBaseAmount(
  membership: MembershipType | null | undefined,
  mode: PeriodMode
): number {
  if (!membership) return 0
  if (mode === 'half' && membership.middle_amount !== null) return membership.middle_amount

  return membership.amount ?? 0
}

/**
 * Monto del recargo por mora configurado para el plan: la diferencia entre el
 * precio con recargo y el precio de lista.
 *
 * Devuelve 0 cuando el plan no tiene recargo cargado, cuando es Diaria o VIP,
 * o cuando `amount_surcharge` quedó por debajo de `amount` — que sería un
 * recargo negativo, o sea un error de carga de precios, no un descuento.
 */
export function getConfiguredSurcharge(membership: MembershipType | null | undefined): number {
  if (!membership) return 0
  if (membership.type === MEMBERSHIP_TYPE_VIP || membership.type === MEMBERSHIP_TYPE_DAILY) {
    return 0
  }

  const { amount, amount_surcharge: amountSurcharge } = membership

  if (amount === null || amountSurcharge === null) return 0

  return Math.max(0, amountSurcharge - amount)
}
