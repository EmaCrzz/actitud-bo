import { getAppTzDateParts, APP_TIMEZONE } from '@/lib/timezone'

/**
 * Helpers de fecha para los asserts contables.
 *
 * Usan los mismos helpers que la app (`@/lib/timezone`) a propósito: si el
 * spec reimplementara la conversión a hora argentina, un bug en
 * `src/lib/timezone.ts` quedaría invisible porque el test estaría comparando
 * contra su propia copia del error. Acá el test compara el valor **guardado**
 * contra la **fuente de verdad** de la app.
 */

/** Día calendario en hora argentina de un timestamp guardado, como "YYYY-MM-DD". */
export function toAppTzIsoDate(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  const { year, month, day } = getAppTzDateParts(date)

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Mes contable ("YYYY-MM") en hora argentina de un timestamp guardado. */
export function toAppTzMonthKey(timestamp: string | Date): string {
  return toAppTzIsoDate(timestamp).slice(0, 7)
}

/**
 * Mensaje de error para los asserts de fecha.
 *
 * El síntoma del bug es un desfase de tres horas, así que un diff pelado
 * ("esperaba 2026-10-01, recibí 2026-09-30") no dice de qué se trata. Esto
 * nombra la causa probable, que es lo que hace accionable el fallo.
 */
export function dateMismatchHint(field: string, expectedIsoDate: string, stored: string): string {
  return [
    `\`${field}\` no cayó en el día elegido.`,
    `  elegido en la UI: ${expectedIsoDate}`,
    `  guardado:         ${stored} (${toAppTzIsoDate(stored)} en ${APP_TIMEZONE})`,
    '',
    'Causa típica: un "YYYY-MM-DD" del datepicker enviado crudo al RPC, sin pasar',
    'por `parseAppTzDateString`. Postgres lo lee como medianoche UTC y queda 3 horas',
    'antes del intent, lo que puede correrlo al día —y al mes contable— anterior.',
    'Ver docs/architecture/decisions/20260709153000_representacion-canonica-de-fechas-ar.md',
  ].join('\n')
}
