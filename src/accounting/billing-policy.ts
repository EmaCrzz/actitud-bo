import { getAppTzDateParts } from '@/lib/timezone'

// Política de cobro por tenant. Hoy está hardcodeado para Actitud; cuando
// aparezca un segundo tenant con reglas distintas, este objeto se promueve a
// configuración por tenant (DB o tenant config file). Los consumidores no
// dependen de los valores concretos sino de las funciones semánticas de abajo.
export type BillingPolicy = {
  gracePeriodEnd: number // último día del mes sin recargo (inclusive)
  surchargeStart: number // primer día con recargo (inclusive)
}

export const ACTITUD_BILLING_POLICY: BillingPolicy = {
  gracePeriodEnd: 15,
  surchargeStart: 16,
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
