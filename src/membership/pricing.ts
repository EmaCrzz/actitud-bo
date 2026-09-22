import {
  ACTITUD_BILLING_POLICY,
  getCyclePhaseForDate,
  qualifiesForHalfMonth,
  type BillingPolicy,
} from '@/accounting/billing-policy'
import {
  getConfiguredSurcharge,
  getPeriodBaseAmount,
  getPeriodModeOptions,
  type PeriodMode,
} from '@/membership/charge-mode'
import { MEMBERSHIP_TYPE_DAILY, MEMBERSHIP_TYPE_VIP } from '@/membership/consts'
import type { MembershipType } from '@/membership/types'

/**
 * Sugerencia de cobro — el precio que el formulario **propone**, no el que
 * impone.
 *
 * Este módulo existe porque la decisión de cuánto cobrar cruza dos cosas que
 * viven en archivos distintos a propósito: la política de fechas del negocio
 * ([src/accounting/billing-policy.ts]) y el catálogo de precios del plan
 * ([src/membership/charge-mode.ts]). Ninguno de los dos debería importar al
 * otro; acá se combinan.
 *
 * La regla de producto (Ema, 2026-09-21): *"quiero proponer un precio y que el
 * usuario sea libre de editarlo. En caso de tener recargo la UI debería
 * sugerirlo porque se cumplen las condiciones, sugerir el monto pero no ser
 * una regla 100% obligatoria."* De ahí que todo lo que devuelve esta función
 * sea un valor inicial editable, y que `suggestsSurcharge` sea una señal para
 * pintar un aviso — nunca un campo deshabilitado ni una validación.
 *
 * Antes de esto, la sugerencia vivía inline en `customer/membership-form.tsx`
 * (v1) como el memo `suggestsSurcharge`, con su propio corte de día del mes
 * que no coincidía con el de `billing-policy.ts`. Ver el comentario de
 * `ACTITUD_BILLING_POLICY` para qué se corrigió.
 */

/**
 * Por qué la política sugiere lo que sugiere. Lo consume la UI para explicarle
 * al operador el motivo en vez de mostrarle un número sin contexto.
 *
 * - `late_payment` — el cliente ya venía este mes y pagó pasada la fecha:
 *   está en mora, corresponde recargo.
 * - `mid_month_entry` — el cliente entra en la segunda mitad del mes: usa
 *   menos mes, paga media membresía. **No es mora.**
 */
export type ChargeSuggestionReason = 'late_payment' | 'mid_month_entry'

export interface SuggestedCharge {
  /** Porción del mes sugerida. Editable por el operador. */
  periodMode: PeriodMode
  /** Precio base sugerido para esa porción, sin recargo ni descuento. */
  base: number
  /** Recargo sugerido. 0 salvo que haya mora con recargo configurado. */
  surcharge: number
  /**
   * True si corresponde recargo por la política. La UI lo usa para destacar el
   * campo y explicar el motivo; el operador puede dejarlo en 0 igual.
   */
  suggestsSurcharge: boolean
  reason: ChargeSuggestionReason | null
}

export interface SuggestedChargeInput {
  membership: MembershipType | null | undefined
  /** Fecha del cobro. El día se resuelve siempre en la TZ del negocio. */
  date?: Date
  /**
   * ¿El cliente registró asistencias este mes?
   *
   * Es el dato que separa mora de ingreso nuevo, y el único que esta función
   * no puede deducir sola. Sin él, un cliente que se suma el día 20 recibiría
   * la misma sugerencia de recargo que uno que viene desde el día 3 y pagó
   * tarde — que es cobrarle una mora a alguien que no debe nada.
   */
  hasAssistancesThisMonth: boolean
  policy?: BillingPolicy
}

export function getSuggestedCharge({
  membership,
  date = new Date(),
  hasAssistancesThisMonth,
  policy = ACTITUD_BILLING_POLICY,
}: SuggestedChargeInput): SuggestedCharge {
  const none: SuggestedCharge = {
    periodMode: 'full',
    base: 0,
    surcharge: 0,
    suggestsSurcharge: false,
    reason: null,
  }

  if (!membership) return none

  // VIP no se cobra; Diaria se cobra a precio único y no tiene ni modalidades
  // ni mora posible (se paga el día que se usa).
  if (membership.type === MEMBERSHIP_TYPE_VIP) return none
  if (membership.type === MEMBERSHIP_TYPE_DAILY) {
    return { ...none, base: membership.amount ?? 0 }
  }

  const isPastDueDate = getCyclePhaseForDate(date, policy) === 'surcharge'

  // Mora: ya venía este mes y paga pasada la fecha.
  if (isPastDueDate && hasAssistancesThisMonth) {
    const surcharge = getConfiguredSurcharge(membership)

    return {
      periodMode: 'full',
      base: getPeriodBaseAmount(membership, 'full'),
      surcharge,
      suggestsSurcharge: surcharge > 0,
      reason: 'late_payment',
    }
  }

  // Ingreso nuevo en la segunda mitad del mes: media membresía, sin recargo.
  // Se exige que el plan tenga la modalidad cargada — si no la tiene,
  // `getPeriodBaseAmount` caería al precio completo y devolveríamos un
  // `periodMode: 'half'` que cobra el mes entero.
  const offersHalf = getPeriodModeOptions(membership).some((option) => option.mode === 'half')

  if (!hasAssistancesThisMonth && qualifiesForHalfMonth(date, policy) && offersHalf) {
    return {
      periodMode: 'half',
      base: getPeriodBaseAmount(membership, 'half'),
      surcharge: 0,
      suggestsSurcharge: false,
      reason: 'mid_month_entry',
    }
  }

  return {
    periodMode: 'full',
    base: getPeriodBaseAmount(membership, 'full'),
    surcharge: 0,
    suggestsSurcharge: false,
    reason: null,
  }
}

export interface ChargeBreakdown {
  base: number
  surcharge: number
  discount: number
}

/**
 * Total a cobrar = base + recargo − descuento.
 *
 * Es la única cuenta que produce el monto final, y el motivo por el que el
 * total no es un campo tipeable: `membership_payments` tiene el CHECK
 * `amount = gross_amount + surcharge_amount - discount_amount` (migración
 * 20260921…), así que un total que no cierre con sus partes lo rechaza la base,
 * no la UI. Cualquier monto sigue siendo alcanzable — editando las partes.
 *
 * Se clampea en 0 para no devolver negativos cuando el descuento excede la
 * suma; ojo que 0 **tampoco** es válido para la DB (`amount > 0`). Eso lo
 * valida el formulario, que es quien puede explicar el error.
 */
export function computeChargeTotal({ base, surcharge, discount }: ChargeBreakdown): number {
  return Math.max(0, base + surcharge - discount)
}
