import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/auth/api/server'
import { getExpenses } from '@/accounting/api/server'
import { getSalesLedger } from '@/sales/api/server'
import { getMonthKeyOfInstant, monthKeyToIsoRange, shiftMonthKey } from '@/lib/month-key'
import { BALANCE_SERIES_MONTHS, buildBalanceSummary, type BalanceSummary } from '../summary'

/**
 * El Balance de un mes: **una** lectura de la ventana de la serie —seis meses
 * terminando en `month`— y todo lo demás calculado de esas filas.
 *
 * Reusa las mismas lecturas que Ventas (`getSalesLedger`) y Gastos
 * (`getExpenses`), con el mismo criterio de caja: así "Ingresos" es el "Total
 * cobrado" de Ventas y "Egresos" el "Total de gastos" de Gastos, sin una
 * tercera interpretación del rango. Las dos tiran si la query falla.
 */
export async function getBalance(month: string): Promise<BalanceSummary> {
  await requireAdmin()

  const range = {
    from: monthKeyToIsoRange(shiftMonthKey(month, -(BALANCE_SERIES_MONTHS - 1))).from,
    to: monthKeyToIsoRange(month).to,
  }

  const [entries, expenses] = await Promise.all([getSalesLedger(range), getExpenses(range)])

  return buildBalanceSummary(entries, expenses, month)
}

/**
 * El mes AR del primer movimiento registrado —cuota, venta o gasto—, o `null`
 * si no hay ninguno. Es el tope hacia atrás del navegador de mes: más allá no
 * hay nada que mostrar salvo pantallas en cero.
 */
export async function getEarliestBalanceMonth(): Promise<string | null> {
  await requireAdmin()

  const supabase = await createClient()
  const earliest = (table: string, column: string) =>
    supabase.from(table).select(column).order(column, { ascending: true }).limit(1).maybeSingle()

  const results = await Promise.all([
    earliest('membership_payments', 'payment_date'),
    earliest('sales', 'sale_date'),
    earliest('expenses', 'expense_date'),
  ])

  const dates = results
    .map((result) => {
      if (result.error) throw new Error(result.error.message)

      return result.data ? Object.values(result.data as Record<string, string>)[0] : null
    })
    .filter((value): value is string => Boolean(value))

  if (dates.length === 0) return null

  return dates.map(getMonthKeyOfInstant).sort()[0]
}
