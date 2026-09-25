import type { ApplicableDiscount } from '@/group/types'
import {
  getAppTzDateParts,
  getEndOfMonthIsoDateInAppTz,
  getTodayIsoDateInAppTz,
  parseAppTzDateString,
  shiftIsoDateInAppTz,
} from '@/lib/timezone'
import { getPeriodBaseAmount, type PeriodMode } from '@/membership/charge-mode'
import { MEMBERSHIP_TYPE_DAILY, MEMBERSHIP_TYPE_VIP } from '@/membership/consts'
import type { MembershipTypes, PaymentType } from '@/membership/consts'
import { computeChargeTotal, type SuggestedCharge } from '@/membership/pricing'
import type { MembershipType } from '@/membership/types'

/**
 * Estado y reglas puras del panel de renovación (Fase 8).
 *
 * Todo lo que hay acá es aritmética de fechas y de montos: sin React, sin
 * Supabase, sin i18n. El panel lo consume para derivar lo que muestra **y** lo
 * que envía, de modo que las dos cosas salgan del mismo cálculo y no puedan
 * divergir — la misma decisión que tomó `resolveMembershipPeriod` en el alta.
 */

/**
 * Cómo se resolvió un monto opcional (descuento o recargo).
 *
 * El Figma dibuja los dos como **selects**, no como campos de monto, y la regla
 * de producto (Ema, 2026-09-21) es que la sugerencia se proponga y se pueda
 * editar. Las dos cosas conviven modelando la elección en vez del número:
 * `none` y `suggested` cubren los casos con concepto —que son los que sostienen
 * el desglose de Ingresos y Balance— y `custom` abre el monto libre para todo
 * lo demás.
 *
 * Guardar la elección y no sólo el monto importa: "sin descuento" y "otro monto
 * que quedó en 0" son estados distintos de la pantalla, y con un único número
 * no se distinguen.
 */
export const AMOUNT_CHOICE_NONE = 'none' as const
export const AMOUNT_CHOICE_SUGGESTED = 'suggested' as const
export const AMOUNT_CHOICE_CUSTOM = 'custom' as const

export type AmountChoice =
  | typeof AMOUNT_CHOICE_NONE
  | typeof AMOUNT_CHOICE_SUGGESTED
  | typeof AMOUNT_CHOICE_CUSTOM

export interface RenewalFormValues {
  membership_type: MembershipTypes | ''
  period_mode: PeriodMode
  /** "YYYY-MM-DD". Se canonicaliza a instante AR recién al salir hacia el RPC. */
  start_date: string
  end_date: string
  discount_choice: AmountChoice
  /** Sólo se usa con `discount_choice === 'custom'`. */
  discount_custom_amount: number
  discount_note: string
  surcharge_choice: AmountChoice
  /** Sólo se usa con `surcharge_choice === 'custom'`. */
  surcharge_custom_amount: number
  surcharge_note: string
  payment_type: PaymentType | ''
}

/**
 * Período que se propone al abrir el panel.
 *
 * **inicio = el día siguiente al vencimiento vigente, o hoy si ya venció.**
 * Renovar antes de que se agote el período no puede arrancar el nuevo hoy: eso
 * le come al cliente los días que ya pagó. El caso es real y frecuente —alguien
 * paga octubre el 28 de septiembre— y desde la migración `20260922125530` la
 * base lo soporta como un pago aparte en vez de pisar el anterior, así que la UI
 * tiene que proponerlo bien.
 *
 * **fin = fin del mes del inicio**, por lo mismo que en el alta: el ciclo de
 * cobro de Actitud es día-de-mes fijo, y vencimientos desparramados por el
 * calendario harían que el recargo contra el día del mes deje de tener sentido.
 *
 * **Salvo el último día del mes**, donde "hoy → fin de mes" deja un período de
 * un solo día. Ahí se propone el **mes siguiente completo**, del 1 a fin de mes.
 * Dos motivos:
 *
 * - Con inicio = fin, `basicMembershipValidation` rechaza el formulario ("la
 *   fecha de finalización debe ser posterior a la fecha de inicio"): el panel se
 *   abriría bloqueado un día de cada mes.
 * - Un día de gimnasio no es una membresía mensual — para eso está el pase
 *   diario. Quien paga el 31 está comprando el mes que viene.
 *
 * Estirar el fin al mes siguiente dejando el inicio en hoy era la otra salida, y
 * no sirve: 30/04 → 31/05 son 31 días y el validador también lo rechaza, porque
 * topea el período en un mes desde el inicio.
 *
 * Es un prefill, no una imposición: el Figma dibuja los dos datepickers y los
 * dos quedan editables — si el operador quiere cubrir hoy, corre el inicio.
 */
export function buildRenewalPeriod(
  expirationDate: string | null,
  /** Inyectable por la misma razón que el `now` de todo `timezone.ts`: el
   * comportamiento cambia según el día del mes y hay que poder ejercitarlo. */
  now: Date = new Date()
): {
  start_date: string
  end_date: string
} {
  const startDate = resolveRenewalStart(expirationDate, getTodayIsoDateInAppTz(now))
  const endOfStartMonth = getEndOfMonthIsoDateInAppTz(parseAppTzDateString(startDate))

  if (endOfStartMonth > startDate) {
    return { start_date: startDate, end_date: endOfStartMonth }
  }

  // Un día después del fin de mes es el 1 del siguiente. Se calcula así y no
  // sumando meses para que febrero y los bisiestos salgan gratis.
  const firstOfNextMonth = shiftIsoDateInAppTz(endOfStartMonth, 1)

  return {
    start_date: firstOfNextMonth,
    end_date: getEndOfMonthIsoDateInAppTz(parseAppTzDateString(firstOfNextMonth)),
  }
}

function resolveRenewalStart(expirationDate: string | null, today: string): string {
  if (!expirationDate) return today

  // `expiration_date` es un timestamptz: su día calendario se lee en la TZ del
  // negocio, no con un slice del ISO en UTC — a las 21hs AR eso ya devuelve el
  // día siguiente.
  const parts = getAppTzDateParts(new Date(expirationDate))
  const expirationIso = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(
    parts.day
  ).padStart(2, '0')}`
  const dayAfter = shiftIsoDateInAppTz(expirationIso, 1)

  // Comparación de strings "YYYY-MM-DD": lexicográfico y cronológico coinciden.
  return dayAfter > today ? dayAfter : today
}

/**
 * Período efectivo que se manda a la DB.
 *
 * El pase diario empieza y vence hoy — es su definición — así que ignora los
 * datepickers. Misma regla que `resolveMembershipPeriod` del alta y que los dos
 * inputs ocultos de v1: se resuelve al usarla, no mutando el estado, para que no
 * pueda quedar desincronizada si el operador cambia de tipo y vuelve.
 */
export function resolveRenewalPeriod(values: RenewalFormValues): {
  start_date: string
  end_date: string
} {
  if (values.membership_type === MEMBERSHIP_TYPE_DAILY) {
    const today = getTodayIsoDateInAppTz()

    return { start_date: today, end_date: today }
  }

  return { start_date: values.start_date, end_date: values.end_date }
}

export interface RenewalAmounts {
  /** Precio del plan según la porción del mes, sin recargo ni descuento. */
  base: number
  surcharge: number
  discount: number
  /** `discount_rules.id` cuando el descuento viene de una regla; null si es manual. */
  discount_rule_id: string | null
  /** base + recargo − descuento, clampeado en 0. */
  total: number
}

export interface RenewalAmountsInput {
  values: RenewalFormValues
  membership: MembershipType | null
  suggestion: SuggestedCharge
  applicableDiscount: ApplicableDiscount | null
}

/**
 * Los cuatro montos de la operación, derivados del estado del formulario.
 *
 * Es el único lugar donde se calcula plata: lo leen el resumen del paso 2, el
 * total del footer y el `FormData` que sale hacia el RPC. Con un solo cálculo,
 * lo que el operador confirma en pantalla y lo que se guarda no pueden diferir
 * — que es exactamente el defecto #3 del Figma, donde el resumen muestra tres
 * números que no cierran entre sí.
 *
 * El total **no es tipeable** por diseño: `membership_payments` tiene el CHECK
 * `amount = gross_amount + surcharge_amount - discount_amount`, así que un total
 * suelto lo rechazaría la base. Cualquier monto sigue siendo alcanzable editando
 * las partes; lo que se vuelve imposible es un monto sin concepto.
 */
export function resolveRenewalAmounts({
  values,
  membership,
  suggestion,
  applicableDiscount,
}: RenewalAmountsInput): RenewalAmounts {
  // VIP no se cobra: el plan vale 0 y `membership_payments` exige `amount > 0`,
  // así que no hay pago posible. Renovar un VIP extiende el período y nada más.
  if (!membership || membership.type === MEMBERSHIP_TYPE_VIP) {
    return { base: 0, surcharge: 0, discount: 0, discount_rule_id: null, total: 0 }
  }

  const base = getPeriodBaseAmount(membership, values.period_mode)
  const surcharge = resolveSurcharge(values, suggestion)
  const { amount: discount, ruleId } = resolveDiscount(values, applicableDiscount)

  return {
    base,
    surcharge,
    discount,
    discount_rule_id: ruleId,
    total: computeChargeTotal({ base, surcharge, discount }),
  }
}

function resolveSurcharge(values: RenewalFormValues, suggestion: SuggestedCharge): number {
  if (values.surcharge_choice === AMOUNT_CHOICE_SUGGESTED) return suggestion.surcharge
  if (values.surcharge_choice === AMOUNT_CHOICE_CUSTOM) {
    return Math.max(0, values.surcharge_custom_amount)
  }

  return 0
}

function resolveDiscount(
  values: RenewalFormValues,
  applicableDiscount: ApplicableDiscount | null
): { amount: number; ruleId: string | null } {
  if (values.discount_choice === AMOUNT_CHOICE_SUGGESTED && applicableDiscount) {
    return { amount: applicableDiscount.suggested_amount, ruleId: applicableDiscount.rule.id }
  }
  if (values.discount_choice === AMOUNT_CHOICE_CUSTOM) {
    // Sin regla asociada: el RPC exige nota para un descuento ad-hoc
    // (`DISCOUNT_NOTE_REQUIRED`), y el formulario la pide antes de llegar ahí.
    return { amount: Math.max(0, values.discount_custom_amount), ruleId: null }
  }

  return { amount: 0, ruleId: null }
}

/**
 * Etiqueta de la fila "Periodo" del resumen.
 *
 * El Figma muestra `Agosto` para un período 01/08 → 31/08, pero con los dos
 * datepickers editables el período no siempre es un mes calendario: 15/08 →
 * 14/09 no es "Agosto" ni ningún otro mes. Cuando coincide se usa el nombre del
 * mes, que es lo que el diseño pide y lo que el operador reconoce; cuando no, el
 * rango completo, que es lo único que no miente.
 *
 * Devuelve el índice del mes (1-12) para que la capa de UI lo traduzca con el
 * diccionario `months`, en vez de resolver acá un nombre en un idioma fijo.
 */
export function getPeriodLabel(
  startDate: string,
  endDate: string
): { kind: 'month'; month: number } | { kind: 'range' } {
  if (!startDate || !endDate) return { kind: 'range' }

  const [, startMonth, startDay] = startDate.split('-').map(Number)
  // El último día se deriva del propio inicio, así que la igualdad ya fija año
  // y mes: no hace falta compararlos aparte.
  const lastDayOfStartMonth = getEndOfMonthIsoDateInAppTz(parseAppTzDateString(startDate))

  if (startDay === 1 && endDate === lastDayOfStartMonth) {
    return { kind: 'month', month: startMonth }
  }

  return { kind: 'range' }
}
