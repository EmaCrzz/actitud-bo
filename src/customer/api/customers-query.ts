import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CUSTOMERS_PAGE_SIZE,
  SEARCH_CUSTOMER,
  SEARCH_CUSTOMER_WITH_MEMBERSHIP,
} from '@/customer/consts'
import { MEMBERSHIP_STATUS_ACTIVE, type CustomerListFilters } from '@/customer/filters'
import type { CustomerWithMembership } from '@/customer/types'
import { mapCustomerRow } from '@/customer/utils'
import { getTodayRangeInAppTz } from '@/lib/timezone'
import { normalizeSearchQuery } from '@/lib/utils/text'

export interface FetchCustomersPageOptions extends Partial<CustomerListFilters> {
  page?: number
  pageSize?: number
}

/**
 * Query canónico del listado de clientes: búsqueda + filtros + paginación.
 *
 * Vive acá y recibe el cliente de Supabase por parámetro porque el listado se
 * consume desde los dos lados — el server component pinta la primera página y el
 * cliente pagina e itera los filtros — y hasta la Fase 6 eran **dos
 * implementaciones idénticas** (`searchAllCustomers` en `api/server.ts` y
 * `_fetchCustomersPage` en `api/client.ts`). Agregar un filtro implicaba
 * escribirlo dos veces y que se desincronizaran en silencio.
 *
 * Lanza si Supabase devuelve error, para que react-query pueda mostrar el estado
 * de error del listado. El wrapper del server lo atrapa y degrada a lista vacía,
 * que es el comportamiento que ya tenía la v1.
 */
export async function fetchCustomersPageWith(
  supabase: SupabaseClient,
  {
    query,
    status = null,
    membershipType = null,
    page = 0,
    pageSize = CUSTOMERS_PAGE_SIZE,
  }: FetchCustomersPageOptions = {}
): Promise<CustomerWithMembership[]> {
  const from = page * pageSize
  const to = from + pageSize - 1
  // Filtrar por columnas de la membresía embebida exige el join `!inner`.
  const needsMembershipJoin = Boolean(status || membershipType)

  let request = supabase
    .from('customers')
    .select(needsMembershipJoin ? SEARCH_CUSTOMER_WITH_MEMBERSHIP : SEARCH_CUSTOMER)
    .order('first_name', { ascending: true })
    .order('id', { ascending: true })
    .range(from, to)

  const trimmedQuery = query?.trim()

  if (trimmedQuery) {
    request = request.ilike('full_name_search', `%${normalizeSearchQuery(trimmedQuery)}%`)
  }

  if (membershipType) {
    request = request.eq('customer_membership.membership_type', membershipType)
  }

  if (status) {
    // Corte a las 00:00 de Argentina, igual que `getActiveMemberships`. Comparar
    // contra `now()` perdería las membresías guardadas como medianoche UTC del
    // día de hoy, que en AR son las 21hs de ayer.
    const { start: todayStartInAppTz } = getTodayRangeInAppTz()
    const todayStart = todayStartInAppTz.toISOString()

    request =
      status === MEMBERSHIP_STATUS_ACTIVE
        ? request.gte('customer_membership.expiration_date', todayStart)
        : // `expiration_date` nulo cuenta como vencida: es lo que devuelve
          // `isExpiredInAppTz(null)`, que es quien decide el badge de la fila. Sin
          // el `is.null` el filtro y el badge dirían cosas distintas de la misma
          // fila. El valor va entre comillas porque el ISO lleva `:` y `.`.
          request.or(`expiration_date.is.null,expiration_date.lt."${todayStart}"`, {
            referencedTable: 'customer_membership',
          })
  }

  const { data, error } = await request

  if (error) throw error

  return (data ?? []).map(mapCustomerRow)
}
