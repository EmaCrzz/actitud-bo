import { getCurrentMonthKeyInAppTz, isValidMonthKey } from '@/lib/month-key'
import { readParam, type RawSearchParams } from '@/lib/search-params'

export const BALANCE_MONTH_PARAM = 'month'

/**
 * El mes que muestra el Balance, leído de `?month=YYYY-MM`.
 *
 * Cae al mes AR en curso si falta o es inválido, y **se acota** a
 * `[earliest, current]`: un mes futuro o anterior al primer movimiento
 * mostraría una pantalla en cero con cara de "no hubo actividad", que es
 * falso en un caso e inútil en el otro.
 */
export function resolveBalanceMonth(
  params: RawSearchParams,
  earliest: string | null,
  now: Date = new Date()
): string {
  const current = getCurrentMonthKeyInAppTz(now)
  const raw = readParam(params, BALANCE_MONTH_PARAM)

  if (!isValidMonthKey(raw) || raw > current) return current
  if (earliest && raw < earliest) return earliest

  return raw
}
