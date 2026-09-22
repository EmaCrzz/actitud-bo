import { getAppTzDateParts } from '@/lib/timezone'

// Política de cobro por tenant. Hoy está hardcodeado para Actitud; cuando
// aparezca un segundo tenant con reglas distintas, este objeto se promueve a
// configuración por tenant (DB o tenant config file). Los consumidores no
// dependen de los valores concretos sino de las funciones semánticas de abajo.
export type BillingPolicy = {
  gracePeriodEnd: number // último día del mes sin recargo (inclusive)
  surchargeStart: number // primer día con recargo por mora (inclusive)
  halfMonthStart: number // primer día en que un ingreso nuevo paga media membresía
}

/**
 * Corte del día del mes — 2026-09-21: pasó del 15/16 al 10/11.
 *
 * Había tres reglas conviviendo y ninguna sabía de las otras:
 *
 *   1. Este objeto decía `gracePeriodEnd: 15`, y lo leen el dashboard de
 *      ingresos (`getIncomesCycleProgress` en accounting/api/incomes.ts, que
 *      clasifica los pagos del mes en "con recargo / sin recargo") y la barra
 *      de `billing-cycle-progress.tsx`, que se pone amarilla en fase surcharge.
 *   2. El form de membresía de v1 sugería recargo desde el día **11**
 *      (`suggestsSurcharge` en customer/membership-form.tsx), sin pasar por
 *      acá.
 *   3. El copy de `membership.surchargeHint` — "pasó el día 10" — que es lo
 *      que el operador lee en pantalla.
 *
 * O sea: el dashboard contaba un pago del día 13 como "sin recargo" mientras
 * el form ya venía sugiriendo cobrarlo con recargo. Dos de las tres reglas
 * apuntaban al 10/11 y sólo esta constante al 15, así que se corrigió esta.
 * Confirmado con Ema el 2026-09-21.
 *
 * Efecto visible en v1: los pagos de los días 11 a 15 —históricos incluidos—
 * pasan a contarse como "con recargo" en el dashboard de ingresos, y la barra
 * del ciclo se pone amarilla cinco días antes. No se migra ningún dato: la
 * clasificación se calcula al leer, no está guardada.
 *
 * `halfMonthStart` es nuevo y no cambia nada por sí solo: nombra el día a
 * partir del cual **un ingreso nuevo** paga media membresía en vez de mes
 * completo. Es un eje distinto del recargo — ver getSuggestedCharge() en
 * [src/membership/pricing.ts], que es quien los combina.
 */
export const ACTITUD_BILLING_POLICY: BillingPolicy = {
  gracePeriodEnd: 10,
  surchargeStart: 11,
  halfMonthStart: 16,
}

export type CyclePhase = 'grace' | 'surcharge'

// Devuelve la fase del ciclo de cobro para un día del mes (1–31).
export function getCyclePhaseForDay(
  dayOfMonth: number,
  policy: BillingPolicy = ACTITUD_BILLING_POLICY
): CyclePhase {
  return dayOfMonth <= policy.gracePeriodEnd ? 'grace' : 'surcharge'
}

// Devuelve la fase del ciclo para una fecha, resolviendo el día en la TZ del negocio.
export function getCyclePhaseForDate(
  date: Date = new Date(),
  policy: BillingPolicy = ACTITUD_BILLING_POLICY
): CyclePhase {
  const { day } = getAppTzDateParts(date)

  return getCyclePhaseForDay(day, policy)
}

// True si la fecha cae en la ventana sin recargo (día 1 a gracePeriodEnd).
export function isWithinGracePeriod(
  date: Date = new Date(),
  policy: BillingPolicy = ACTITUD_BILLING_POLICY
): boolean {
  return getCyclePhaseForDate(date, policy) === 'grace'
}

/**
 * True si la fecha cae en la segunda mitad del mes, donde un ingreso nuevo
 * paga media membresía en vez de mes completo.
 *
 * Ojo con la diferencia contra `isWithinGracePeriod`: esto **no** habla de
 * mora. Alguien que se suma el día 20 no debe nada de meses anteriores; paga
 * menos porque usa menos mes. La mora es lo contrario — alguien que ya venía
 * y pagó tarde. Los dos ejes se cruzan en getSuggestedCharge().
 */
export function qualifiesForHalfMonth(
  date: Date = new Date(),
  policy: BillingPolicy = ACTITUD_BILLING_POLICY
): boolean {
  const { day } = getAppTzDateParts(date)

  return day >= policy.halfMonthStart
}
