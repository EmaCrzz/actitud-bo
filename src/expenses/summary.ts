import { PAYMENT_CASH, PAYMENT_TRANSFER } from '@/membership/consts'
import type { Expense } from '@/accounting/types'

/**
 * Los tres KPIs de la sección Gastos: **Total de gastos / Efectivo /
 * Transferencias**.
 *
 * Es función pura y recibe la lista ya filtrada porque los tres números tienen
 * que cuadrar con lo que la tabla muestra. Calcularlos con una query aparte
 * —un `sum()` en el server contra los mismos filtros— habría dejado dos
 * caminos capaces de discrepar: alcanza con que uno interprete el rango de
 * fechas medio día distinto para que los KPIs digan una cosa y las filas otra,
 * sin ningún error visible. Acá salen de las mismas filas, por construcción.
 *
 * **`cash + transfer` no tiene por qué dar `total`.** Un gasto sin
 * `payment_method` suma al total y a ninguno de los otros dos. No es un bug:
 * son los 29 gastos previos a la Fase 11 y los reintegros que inserta el RPC
 * de renovación, que no conoce el medio de pago. `unspecified` existe para que
 * la diferencia se pueda mostrar en vez de quedar como un descuadre mudo.
 */
export interface ExpensesSummary {
  total: number
  cash: number
  transfer: number
  /** Suma de los gastos sin medio de pago. `total - cash - transfer`. */
  unspecified: number
  count: number
}

export function summarizeExpenses(expenses: Expense[]): ExpensesSummary {
  return expenses.reduce<ExpensesSummary>(
    (acc, expense) => {
      // `?? 0` y no `|| 0`: son equivalentes acá, pero el importe de un gasto
      // podría legítimamente ser 0 y no queremos que la intención dependa de
      // eso.
      const amount = expense.amount ?? 0

      acc.total += amount
      acc.count += 1

      if (expense.payment_method === PAYMENT_CASH) acc.cash += amount
      else if (expense.payment_method === PAYMENT_TRANSFER) acc.transfer += amount
      else acc.unspecified += amount

      return acc
    },
    { total: 0, cash: 0, transfer: 0, unspecified: 0, count: 0 }
  )
}
