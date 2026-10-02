import { getMonthKeyOfInstant, getMonthKeysEndingAt, shiftMonthKey } from '@/lib/month-key'
import { normalizeCategoryValue } from '@/expenses/utils'
import { SALE_KIND_MEMBERSHIP, SALE_KIND_PRODUCT, type SalesLedgerEntry } from '@/sales/types'
import type { Expense } from '@/accounting/types'

/** Cuántos meses dibuja "Evolución", terminando en el mes elegido. */
export const BALANCE_SERIES_MONTHS = 6

export interface BalanceTotals {
  income: number
  expenses: number
  /** `income - expenses`. Puede ser negativo. */
  result: number
}

export interface BalanceMonthPoint extends BalanceTotals {
  /** "YYYY-MM" */
  month: string
}

export interface BreakdownRow {
  key: string
  total: number
  count: number
}

/** Una fila de "Por concepto": un plan, o los productos todos juntos. */
export interface ConceptRow extends BreakdownRow {
  kind: typeof SALE_KIND_MEMBERSHIP | typeof SALE_KIND_PRODUCT
  /** Nombre libre de un plan creado desde la UI; NULL en los del catálogo. */
  planName: string | null
  /** Cupo semanal: define el orden de la lista. NULL en productos. */
  weeklyQuota: number | null
}

export interface BalanceAdjustments {
  /** Lo que se dejó de cobrar contra el precio de lista. */
  discounts: number
  discountedCount: number
  /** Lo que se cobró de más por pago fuera de término. */
  surcharges: number
  surchargedCount: number
}

export interface BalanceSummary {
  month: string
  current: BalanceTotals
  /**
   * Diferencia del resultado contra el mes anterior. `null` si el mes anterior
   * no tuvo **ningún** movimiento: comparar contra un mes vacío daría "+ todo el
   * resultado", que se lee como una mejora y es sólo ausencia de datos.
   */
  resultDelta: number | null
  /** Del más viejo al más nuevo; el último es `month`. */
  series: BalanceMonthPoint[]
  incomeByMethod: BreakdownRow[]
  incomeByConcept: ConceptRow[]
  expensesByCategory: BreakdownRow[]
  adjustments: BalanceAdjustments
}

/**
 * El Balance de un mes (Fase 13), calculado de **las mismas filas** que listan
 * Ventas y Gastos.
 *
 * Recibe la ventana entera de la serie —seis meses— y no hace otra consulta
 * para el mes elegido: el total de arriba y la última barra de "Evolución" son
 * el mismo número por construcción, y cada desglose suma exactamente su total.
 * Con un `sum()` por bloque en el server, alcanzaría con que uno interprete el
 * rango distinto para que la pantalla se contradiga sin ningún error visible.
 *
 * El mes de cada fila es su **mes AR** (`getMonthKeyOfInstant`): una cuota
 * cobrada el 31 a las 22:00 AR es del 1 en UTC, y agrupada por el ISO caería
 * en el mes siguiente.
 *
 * Los ingresos son cuotas **y** productos: la misma unión que Ventas
 * (`buildSalesLedger`), así que "Ingresos" acá es el "Total cobrado" de allá.
 */
export function buildBalanceSummary(
  entries: SalesLedgerEntry[],
  expenses: Expense[],
  month: string
): BalanceSummary {
  const months = getMonthKeysEndingAt(month, BALANCE_SERIES_MONTHS)
  const income = new Map<string, number>()
  const spent = new Map<string, number>()
  const active = new Set<string>()

  const byMethod = new Map<string, BreakdownRow>()
  const byConcept = new Map<string, ConceptRow>()
  const byCategory = new Map<string, BreakdownRow>()
  const adjustments: BalanceAdjustments = {
    discounts: 0,
    discountedCount: 0,
    surcharges: 0,
    surchargedCount: 0,
  }

  for (const entry of entries) {
    const key = getMonthKeyOfInstant(entry.date)

    income.set(key, (income.get(key) ?? 0) + entry.amount)
    active.add(key)
    if (key !== month) continue

    addTo(byMethod, entry.paymentMethod, entry.amount, () => ({ key: entry.paymentMethod }))

    if (entry.kind === SALE_KIND_PRODUCT) {
      // Todos los productos en una sola fila: sin catálogo, cada venta es un
      // texto libre y una fila por texto sería una por venta.
      addTo(byConcept, SALE_KIND_PRODUCT, entry.amount, () => ({
        key: SALE_KIND_PRODUCT,
        kind: SALE_KIND_PRODUCT,
        planName: null,
        weeklyQuota: null,
      }))
    } else {
      addTo(byConcept, entry.membershipType, entry.amount, () => ({
        key: entry.membershipType,
        kind: SALE_KIND_MEMBERSHIP,
        planName: entry.planName,
        weeklyQuota: entry.weeklyQuota,
      }))

      if (entry.discountAmount > 0) {
        adjustments.discounts += entry.discountAmount
        adjustments.discountedCount += 1
      }
      if (entry.surchargeAmount > 0) {
        adjustments.surcharges += entry.surchargeAmount
        adjustments.surchargedCount += 1
      }
    }
  }

  for (const expense of expenses) {
    const key = getMonthKeyOfInstant(expense.expense_date)
    const amount = expense.amount ?? 0

    spent.set(key, (spent.get(key) ?? 0) + amount)
    active.add(key)
    if (key !== month) continue

    // Las categorías viejas se guardaron en español ("Servicios"); sin
    // normalizar, el mismo concepto aparecería en dos filas.
    const category = normalizeCategoryValue(expense.category)

    addTo(byCategory, category, amount, () => ({ key: category }))
  }

  const totalsOf = (key: string): BalanceTotals => {
    const monthIncome = income.get(key) ?? 0
    const monthExpenses = spent.get(key) ?? 0

    return { income: monthIncome, expenses: monthExpenses, result: monthIncome - monthExpenses }
  }

  const current = totalsOf(month)
  const previousKey = shiftMonthKey(month, -1)

  return {
    month,
    current,
    resultDelta: active.has(previousKey) ? current.result - totalsOf(previousKey).result : null,
    series: months.map((key) => ({ month: key, ...totalsOf(key) })),
    incomeByMethod: sortByTotal(byMethod),
    incomeByConcept: sortConcepts(byConcept),
    expensesByCategory: sortByTotal(byCategory),
    adjustments,
  }
}

function addTo<T extends BreakdownRow>(
  map: Map<string, T>,
  key: string,
  amount: number,
  create: () => Omit<T, 'total' | 'count'>
) {
  const row = map.get(key) ?? ({ ...create(), total: 0, count: 0 } as T)

  row.total += amount
  row.count += 1
  map.set(key, row)
}

/**
 * "Ingresos por concepto" no va por monto sino **por plan, de más días a
 * menos**: 5 días, 3 días, 2 días, pase diario, y los productos al final
 * (pedido de Ema, 2026-10-01). Es el orden en que el operador piensa los
 * planes, y no cambia de un mes a otro: ordenada por monto, la lista se
 * reacomodaba cada mes y había que buscar cada plan.
 *
 * El orden sale de `weekly_quota`, que tienen los cinco planes del catálogo
 * (el pase diario, 1) y los creados desde la UI, así que uno nuevo cae solo en
 * su lugar. A igual cupo desempata el monto. Un plan sin cupo conocido va
 * después de los que lo tienen.
 */
function sortConcepts(map: Map<string, ConceptRow>): ConceptRow[] {
  const rank = (row: ConceptRow) =>
    row.kind === SALE_KIND_PRODUCT ? -2 : (row.weeklyQuota ?? -1)

  return [...map.values()].sort((a, b) => rank(b) - rank(a) || b.total - a.total)
}

function sortByTotal<T extends BreakdownRow>(map: Map<string, T>): T[] {
  return [...map.values()].sort((a, b) => b.total - a.total)
}
