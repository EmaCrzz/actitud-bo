import { PaymentTypeArray, type PaymentType } from '@/membership/consts'
import { removeAccents } from '@/lib/utils/text'
import {
  parseDateRangeParams,
  rangeListFiltersToQueryString,
  type IsoDateRange,
} from '@/lib/date-range-params'
import { parsePageParam, readParam, type RawSearchParams } from '@/lib/search-params'
import {
  SALE_KIND_MEMBERSHIP,
  SALE_KIND_PRODUCT,
  type SaleKind,
  type SalesLedgerEntry,
} from './types'

/** Nombres de los query params del listado de ventas. Mismos que Gastos. */
export const SALE_FILTER_PARAM = {
  query: 'q',
  from: 'from',
  to: 'to',
  method: 'method',
  kind: 'kind',
  page: 'page',
} as const

const SALE_KINDS: string[] = [SALE_KIND_MEMBERSHIP, SALE_KIND_PRODUCT]

export interface SaleListFilters extends IsoDateRange {
  query: string
  method: PaymentType | null
  /**
   * Cuotas o productos. No está en el diseño: lo pidió Ema probando la fase
   * (2026-10-01), para separar lo que entra por membresías de lo que entra por
   * mostrador.
   */
  kind: SaleKind | null
}

/**
 * Lee los filtros de los searchParams. El rango cae al mes AR en curso —ver
 * `parseDateRangeParams`— y un método desconocido no filtra.
 *
 * Sin el valor "Sin especificar" que tiene Gastos: acá no hay filas sin medio
 * de pago (ver `summarizeSalesLedger`). Un concepto desconocido tampoco filtra.
 */
export function parseSaleFilters(params: RawSearchParams, now: Date = new Date()): SaleListFilters {
  const method = readParam(params, SALE_FILTER_PARAM.method)
  const kind = readParam(params, SALE_FILTER_PARAM.kind)

  return {
    query: readParam(params, SALE_FILTER_PARAM.query) ?? '',
    ...parseDateRangeParams(params, SALE_FILTER_PARAM, now),
    method: (PaymentTypeArray as string[]).includes(method ?? '') ? (method as PaymentType) : null,
    kind: SALE_KINDS.includes(kind ?? '') ? (kind as SaleKind) : null,
  }
}

export function saleFiltersToQueryString(filters: SaleListFilters, page = 0): string {
  const params = new URLSearchParams(rangeListFiltersToQueryString(filters, page, SALE_FILTER_PARAM))

  if (filters.kind) params.set(SALE_FILTER_PARAM.kind, filters.kind)

  return params.toString()
}

export function parseSalePage(params: RawSearchParams): number {
  return parsePageParam(params, SALE_FILTER_PARAM.page)
}

/**
 * ¿Esta fila pasa el filtro de método, el de concepto y el de búsqueda?
 *
 * El rango de fechas no se evalúa acá: lo resuelve la consulta. Los otros dos
 * se aplican en memoria, como en Gastos, para que los KPIs describan el
 * período completo mientras la tabla muestra el subconjunto.
 *
 * **La búsqueda va contra el nombre y, en los productos, contra el detalle.**
 * El placeholder del diseño dice "nombre o apellido", pero en una venta sin
 * cliente el nombre puede no existir, y "remera" es la búsqueda obvia para
 * encontrarla. No busca en la etiqueta del plan de una cuota: para eso está
 * Membresías.
 */
export function matchesSaleFilters(
  entry: SalesLedgerEntry,
  filters: { query: string; method: PaymentType | null; kind: SaleKind | null }
): boolean {
  if (filters.method && entry.paymentMethod !== filters.method) return false
  if (filters.kind && entry.kind !== filters.kind) return false

  const query = removeAccents(filters.query.trim().toLowerCase())

  if (!query) return true

  const haystack = [entry.buyerName, entry.kind === SALE_KIND_PRODUCT ? entry.description : null]
    .filter(Boolean)
    .join(' ')

  return removeAccents(haystack.toLowerCase()).includes(query)
}
