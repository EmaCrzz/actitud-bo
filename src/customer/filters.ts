import { MembershipTypeArray, type MembershipTypes } from '@/membership/consts'

// Estado de membresía del cliente.
//
// El dropdown `Estado` del Figma (`2118:22594`, captura del 2026-09-16) lista
// **cinco** valores: Activo · Por vencer · Vencido · Inactivos · De baja. Acá
// están los tres que se pueden derivar de `customer_membership.expiration_date`,
// que es la única señal de estado que existe en el schema.
//
// Los otros dos **no están modelados y no se inventan**:
//   - `Inactivos` y `De baja` necesitan una columna de estado en `customers` (o
//     un cálculo sobre `assistance`, según qué signifiquen), y todavía no está
//     definido qué los distingue. Ver decisión abierta #13 del plan v2.
//   - `Sin membresía` se muestra como badge neutral en la fila pero no es
//     filtrable: hoy es "sin fila en customer_membership", que PostgREST no
//     filtra limpio. Se resuelve con la brecha B13, en la Fase 7.
//
// `CustomerFilters` los renderiza deshabilitados para que el dropdown siga
// pareciéndose al diseño sin devolver resultados inventados.
export const MEMBERSHIP_STATUS_ACTIVE = 'active' as const
export const MEMBERSHIP_STATUS_EXPIRING = 'expiring' as const
export const MEMBERSHIP_STATUS_EXPIRED = 'expired' as const

export const MembershipStatusArray = [
  MEMBERSHIP_STATUS_ACTIVE,
  MEMBERSHIP_STATUS_EXPIRING,
  MEMBERSHIP_STATUS_EXPIRED,
]

export type MembershipStatusFilter =
  | typeof MEMBERSHIP_STATUS_ACTIVE
  | typeof MEMBERSHIP_STATUS_EXPIRING
  | typeof MEMBERSHIP_STATUS_EXPIRED

/** Valor del dropdown que representa "sin filtrar". Es el default de `FilterDropdown`. */
export const FILTER_ALL = 'all' as const

/** Nombres de los query params. El link del home los usa para llegar filtrado. */
export const CUSTOMER_FILTER_PARAM = {
  query: 'q',
  status: 'status',
  type: 'type',
  page: 'page',
} as const

export interface CustomerListFilters {
  query: string
  status: MembershipStatusFilter | null
  membershipType: MembershipTypes | null
}

export const EMPTY_CUSTOMER_FILTERS: CustomerListFilters = {
  query: '',
  status: null,
  membershipType: null,
}

type RawSearchParams = Record<string, string | string[] | undefined>

function readParam(params: RawSearchParams, key: string): string | null {
  const value = params[key]
  const raw = Array.isArray(value) ? value[0] : value

  return raw?.trim() ? raw.trim() : null
}

/**
 * Lee los filtros de los searchParams de la URL, descartando valores que no
 * existan. Un `?status=cualquier-cosa` no filtra en vez de romper la página.
 */
export function parseCustomerFilters(params: RawSearchParams): CustomerListFilters {
  const status = readParam(params, CUSTOMER_FILTER_PARAM.status)
  const membershipType = readParam(params, CUSTOMER_FILTER_PARAM.type)

  return {
    query: readParam(params, CUSTOMER_FILTER_PARAM.query) ?? '',
    status: MembershipStatusArray.includes(status as MembershipStatusFilter)
      ? (status as MembershipStatusFilter)
      : null,
    membershipType: MembershipTypeArray.includes(membershipType as MembershipTypes)
      ? (membershipType as MembershipTypes)
      : null,
  }
}

/**
 * Serializa los filtros activos a query string (sin `?`). Vacío si no hay ninguno.
 *
 * `page` es opcional y sólo se escribe a partir de la segunda: así el link del
 * card del home, que llama con un solo argumento, sigue generando exactamente
 * la misma URL que antes.
 */
export function customerFiltersToQueryString(
  filters: Partial<CustomerListFilters>,
  page = 0
): string {
  const params = new URLSearchParams()

  if (filters.query?.trim()) params.set(CUSTOMER_FILTER_PARAM.query, filters.query.trim())
  if (filters.status) params.set(CUSTOMER_FILTER_PARAM.status, filters.status)
  if (filters.membershipType) params.set(CUSTOMER_FILTER_PARAM.type, filters.membershipType)
  // En la URL la página es 1-indexed, que es la que ve el usuario en el paginador.
  if (page > 0) params.set(CUSTOMER_FILTER_PARAM.page, String(page + 1))

  return params.toString()
}

/**
 * Página 0-indexed leída de `?page=`. Cualquier valor inválido o menor a 1 cae
 * en la primera, igual que los filtros: un query param roto no rompe la página.
 */
export function parseCustomerPage(params: RawSearchParams): number {
  const raw = readParam(params, CUSTOMER_FILTER_PARAM.page)
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN

  return Number.isFinite(parsed) && parsed > 1 ? parsed - 1 : 0
}

export function hasActiveCustomerFilters(filters: CustomerListFilters): boolean {
  return Boolean(filters.query.trim() || filters.status || filters.membershipType)
}

export function areSameCustomerFilters(a: CustomerListFilters, b: CustomerListFilters): boolean {
  return (
    a.query.trim() === b.query.trim() &&
    a.status === b.status &&
    a.membershipType === b.membershipType
  )
}
