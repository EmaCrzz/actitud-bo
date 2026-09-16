import { MembershipTypeArray, type MembershipTypes } from '@/membership/consts'

// Estado de membresía del cliente. Son los dos valores que el Figma dibuja en el
// `StatusBadge` de cada fila ("Activo" verde / "Vencida" rojo).
//
// No existe un tercer valor "sin membresía" a propósito: el select del alta de
// cliente lo ofrece (decisión abierta #6 del plan v2) pero todavía no es un
// estado modelado — `customer_membership.membership_type` es NOT NULL con FK, así
// que hoy "sin membresía" es "sin fila", que PostgREST no filtra limpio. Cuando la
// Fase 7 resuelva la brecha B13 se agrega acá y el resto del filtro no cambia.
export const MEMBERSHIP_STATUS_ACTIVE = 'active' as const
export const MEMBERSHIP_STATUS_EXPIRED = 'expired' as const

export const MembershipStatusArray = [MEMBERSHIP_STATUS_ACTIVE, MEMBERSHIP_STATUS_EXPIRED]

export type MembershipStatusFilter =
  | typeof MEMBERSHIP_STATUS_ACTIVE
  | typeof MEMBERSHIP_STATUS_EXPIRED

/** Valor del dropdown que representa "sin filtrar". Es el default de `FilterDropdown`. */
export const FILTER_ALL = 'all' as const

/** Nombres de los query params. El link del home los usa para llegar filtrado. */
export const CUSTOMER_FILTER_PARAM = {
  query: 'q',
  status: 'status',
  type: 'type',
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

/** Serializa los filtros activos a query string (sin `?`). Vacío si no hay ninguno. */
export function customerFiltersToQueryString(filters: Partial<CustomerListFilters>): string {
  const params = new URLSearchParams()

  if (filters.query?.trim()) params.set(CUSTOMER_FILTER_PARAM.query, filters.query.trim())
  if (filters.status) params.set(CUSTOMER_FILTER_PARAM.status, filters.status)
  if (filters.membershipType) params.set(CUSTOMER_FILTER_PARAM.type, filters.membershipType)

  return params.toString()
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
