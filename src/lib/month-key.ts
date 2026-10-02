import { getAppTzDateParts, getMonthRangeFromKey, toAppTzIsoDate } from '@/lib/timezone'
import type { IsoDateRange } from '@/lib/date-range-params'

/**
 * Meses calendario del negocio como `"YYYY-MM"`.
 *
 * Nacieron privados en `src/accounting/api/incomes.ts` (el dashboard de v1) y
 * se mudaron acá cuando el Balance de v2 (Fase 13) necesitó navegar meses,
 * compararlos y armar una serie. **Todo es en la TZ del negocio**: el "mes
 * actual" calculado en UTC desde el server se adelanta tres horas, y el día 1
 * a la medianoche AR caería en el mes anterior.
 */
const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/

export function isValidMonthKey(value: string | null | undefined): value is string {
  return typeof value === 'string' && MONTH_KEY.test(value)
}

/** El mes en curso en Argentina. */
export function getCurrentMonthKeyInAppTz(now: Date = new Date()): string {
  const { year, month } = getAppTzDateParts(now)

  return toMonthKey(year, month)
}

/** El mes AR al que pertenece un instante. */
export function getMonthKeyOfInstant(instant: string | Date): string {
  return toAppTzIsoDate(instant).slice(0, 7)
}

/** Corre un mes `n` meses (negativo = hacia atrás), cruzando años. */
export function shiftMonthKey(monthKey: string, months: number): string {
  const [year, month] = monthKey.split('-').map(Number)
  const index = year * 12 + (month - 1) + months

  return toMonthKey(Math.floor(index / 12), (index % 12) + 1)
}

/** Los `count` meses que terminan en `anchor`, del más viejo al más nuevo. */
export function getMonthKeysEndingAt(anchor: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => shiftMonthKey(anchor, index - count + 1))
}

/**
 * El mes como rango de días AR **inclusivo** (`from`/`to`), la forma que
 * aceptan `getSalesLedger` y `getExpenses`. El último día se deriva del
 * arranque exclusivo del mes siguiente, para no hardcodear 28/30/31.
 */
export function monthKeyToIsoRange(monthKey: string): IsoDateRange {
  const { start, end } = getMonthRangeFromKey(monthKey)

  return { from: toAppTzIsoDate(start), to: toAppTzIsoDate(new Date(end.getTime() - 1)) }
}

function toMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}
