import { PAYMENT_CASH, PAYMENT_TRANSFER } from '@/membership/consts'
import type { SalesLedgerEntry } from './types'

/**
 * Los tres KPIs de la sección Ventas: **Total cobrado / Efectivo /
 * Transferencias**. Cuotas y productos juntos: es todo lo que entró.
 *
 * Función pura sobre las mismas filas que lista la tabla, por la misma razón
 * que `summarizeExpenses`: un `sum()` aparte en el server sería un segundo
 * camino capaz de interpretar el rango distinto.
 *
 * A diferencia de Gastos, acá `cash + transfer` **siempre** da `total`: las
 * dos tablas exigen medio de pago (`sales` por CHECK; en `membership_payments`
 * no hay una sola fila sin él, medido en prod el 2026-10-01). Un valor fuera
 * de esos dos sumaría al total y a ninguno de los otros, y la diferencia se
 * vería — pero no debería existir.
 */
export interface SalesSummary {
  total: number
  cash: number
  transfer: number
  count: number
}

export function summarizeSalesLedger(entries: SalesLedgerEntry[]): SalesSummary {
  return entries.reduce<SalesSummary>(
    (acc, entry) => {
      acc.total += entry.amount
      acc.count += 1

      if (entry.paymentMethod === PAYMENT_CASH) acc.cash += entry.amount
      else if (entry.paymentMethod === PAYMENT_TRANSFER) acc.transfer += entry.amount

      return acc
    },
    { total: 0, cash: 0, transfer: 0, count: 0 }
  )
}
