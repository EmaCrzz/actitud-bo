import { PaymentTypeArray, type PaymentType } from '@/membership/consts'
import { removeAccents } from '@/lib/utils/text'
import type { Expense } from '@/accounting/types'
import { getMonthRangeInAppTz, parseAppTzDateString, toAppTzIsoDate } from '@/lib/timezone'
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
 * pantalla fechada "Lunes, 01 de Agosto". Se calcula con
 * `getMonthRangeInAppTz`, no con `new Date()`: el server corre en UTC y el
 * primer día del mes calculado ahí se adelanta tres horas, así que el 1 a la
 * medianoche AR caería en el mes anterior.
 *
 * `end` es el arranque exclusivo del mes siguiente, así que el último día del
 * mes se obtiene restándole un día.
 */
export function getDefaultExpenseRange(now: Date = new Date()): { from: string; to: string } {
  const { start, end } = getMonthRangeInAppTz(now)
  const lastDay = new Date(end.getTime() - 1)

  return { from: toAppTzIsoDate(start), to: toAppTzIsoDate(lastDay) }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * ¿Es un día de calendario que existe?
 *
 * El regex solo **no alcanza**, y lo descubrió su propio test: `2026-13-45`
 * tiene la forma correcta, así que pasaba el filtro, y como ordena después de
 * `2026-09-30` disparaba el swap del rango invertido y terminaba mandando a
 * Postgres un mes 13. El round trip por la TZ del negocio descarta también los
 * días que no existen en su mes (`2026-02-30` vuelve como `2026-03-02`).
 */
function isRealAppTzDate(iso: string): boolean {
  if (!ISO_DATE.test(iso)) return false

  return toAppTzIsoDate(parseAppTzDateString(iso)) === iso
}

/**
 * Lee los filtros de los searchParams. Un valor inválido no filtra en vez de
 * romper la página — mismo criterio que `parseCustomerFilters`.
 *
 * Las fechas caen al mes en curso si faltan o no son días reales — ver
 * `isRealAppTzDate`. Un rango inválido que pasara silencioso listaría cero
 * gastos con cara de "no hay nada cargado", o directamente rompería la query.
 */
export function parseExpenseFilters(
  params: RawSearchParams,
  now: Date = new Date()
): ExpenseListFilters {
  const fallback = getDefaultExpenseRange(now)
  const from = readParam(params, EXPENSE_FILTER_PARAM.from)
  const to = readParam(params, EXPENSE_FILTER_PARAM.to)
  const method = readParam(params, EXPENSE_FILTER_PARAM.method)

  const parsed = {
    query: readParam(params, EXPENSE_FILTER_PARAM.query) ?? '',
    from: from && isRealAppTzDate(from) ? from : fallback.from,
    to: to && isRealAppTzDate(to) ? to : fallback.to,
    method: PaymentFilterArray.includes(method ?? '') ? (method as ExpensePaymentFilter) : null,
  }

  // Un rango dado vuelta (`from` posterior a `to`) devolvería cero filas sin
  // decir por qué. Se ordena en vez de vaciarse: es lo que el operador quiso.
  return parsed.from > parsed.to ? { ...parsed, from: parsed.to, to: parsed.from } : parsed
}

/** Serializa los filtros a query string (sin `?`). */
export function expenseFiltersToQueryString(filters: ExpenseListFilters, page = 0): string {
  const params = new URLSearchParams()

  if (filters.query.trim()) params.set(EXPENSE_FILTER_PARAM.query, filters.query.trim())
  params.set(EXPENSE_FILTER_PARAM.from, filters.from)
  params.set(EXPENSE_FILTER_PARAM.to, filters.to)
  if (filters.method) params.set(EXPENSE_FILTER_PARAM.method, filters.method)
  // En la URL la página es 1-indexed, que es la que ve el operador.
  if (page > 0) params.set(EXPENSE_FILTER_PARAM.page, String(page + 1))

  return params.toString()
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
