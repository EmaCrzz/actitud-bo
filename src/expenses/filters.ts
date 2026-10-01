import { PaymentTypeArray, type PaymentType } from '@/membership/consts'
import { removeAccents } from '@/lib/utils/text'
import type { Expense } from '@/accounting/types'
import {
  getDefaultMonthRangeInAppTz,
  parseDateRangeParams,
  rangeListFiltersToQueryString,
} from '@/lib/date-range-params'
import { parsePageParam, readParam, type RawSearchParams } from '@/lib/search-params'

/** Valor del dropdown que representa "sin filtrar". Es el default de `FilterDropdown`. */
export const FILTER_ALL = 'all' as const

/**
 * Valor del dropdown `Método` para los gastos **sin** medio de pago.
 *
 * No está en las capturas: el diseño lista sólo Efectivo y Transferencia. Se
 * agrega porque sin él los 29 gastos previos a esta fase —y los reintegros que
 * inserta el RPC de renovación— no se pueden aislar, y son justamente los que
 * alguien querría encontrar para clasificarlos. Mismo criterio que el campo
 * Estado de la Fase 10: el diseño omite un estado que el modelo sí tiene.
 */
export const PAYMENT_METHOD_UNSPECIFIED = 'unspecified' as const

export type ExpensePaymentFilter = PaymentType | typeof PAYMENT_METHOD_UNSPECIFIED

const PaymentFilterArray: string[] = [...PaymentTypeArray, PAYMENT_METHOD_UNSPECIFIED]

/** Nombres de los query params del listado de gastos. */
export const EXPENSE_FILTER_PARAM = {
  query: 'q',
  from: 'from',
  to: 'to',
  method: 'method',
  page: 'page',
} as const

export interface ExpenseListFilters {
  query: string
  /** "YYYY-MM-DD" — día AR desde el que se listan gastos, inclusive. */
  from: string
  /** "YYYY-MM-DD" — día AR hasta el que se listan gastos, inclusive. */
  to: string
  method: ExpensePaymentFilter | null
}

/**
 * Rango por default: **el mes en curso**.
 *
 * Sale de las capturas, que muestran `01/08/2026` y `31/08/2026` en una
 * pantalla fechada "Lunes, 01 de Agosto". El cálculo vive en
 * `getDefaultMonthRangeInAppTz`, compartido con Ventas.
 */
export const getDefaultExpenseRange = getDefaultMonthRangeInAppTz

/**
 * Lee los filtros de los searchParams. Un valor inválido no filtra en vez de
 * romper la página — mismo criterio que `parseCustomerFilters`. El rango lo
 * resuelve `parseDateRangeParams`: ver ahí el fallback y el swap.
 */
export function parseExpenseFilters(
  params: RawSearchParams,
  now: Date = new Date()
): ExpenseListFilters {
  const method = readParam(params, EXPENSE_FILTER_PARAM.method)

  return {
    query: readParam(params, EXPENSE_FILTER_PARAM.query) ?? '',
    ...parseDateRangeParams(params, EXPENSE_FILTER_PARAM, now),
    method: PaymentFilterArray.includes(method ?? '') ? (method as ExpensePaymentFilter) : null,
  }
}

/** Serializa los filtros a query string (sin `?`). */
export function expenseFiltersToQueryString(filters: ExpenseListFilters, page = 0): string {
  return rangeListFiltersToQueryString(filters, page, EXPENSE_FILTER_PARAM)
}

export function parseExpensePage(params: RawSearchParams): number {
  return parsePageParam(params, EXPENSE_FILTER_PARAM.page)
}

/**
 * ¿Este gasto pasa el filtro de método y el de búsqueda?
 *
 * **El rango de fechas no se evalúa acá**: ese lo resuelve la consulta, y las
 * filas que llegan ya están dentro. Los otros dos se aplican en memoria, que es
 * lo que permite que los KPIs describan el período completo mientras la tabla
 * muestra el subconjunto — ver `ExpensesSection`.
 *
 * La búsqueda va sólo contra la descripción, igual que cuando la resolvía el
 * server: `category` guarda la clave (`SERVICES`), no la etiqueta que se ve en
 * pantalla, así que buscar ahí no encontraría "servicios" y sí encontraría
 * cosas por motivos que nadie puede explicar.
 */
export function matchesExpenseFilters(
  expense: Pick<Expense, 'description' | 'payment_method'>,
  filters: { query: string; method: ExpensePaymentFilter | null }
): boolean {
  const query = filters.query.trim().toLowerCase()

  if (
    query &&
    !removeAccents(expense.description ?? '')
      .toLowerCase()
      .includes(removeAccents(query))
  ) {
    return false
  }

  if (!filters.method) return true

  // "Sin especificar" es ausencia, no un valor: un `===` contra la clave nunca
  // matchearía los 29 gastos históricos ni los reintegros del RPC.
  if (filters.method === PAYMENT_METHOD_UNSPECIFIED) return expense.payment_method == null

  return expense.payment_method === filters.method
}
