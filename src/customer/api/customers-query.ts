import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CUSTOMERS_LISTING_RELATION,
  CUSTOMERS_PAGE_SIZE,
  SEARCH_CUSTOMER,
  SEARCH_CUSTOMER_WITH_MEMBERSHIP,
} from '@/customer/consts'
import {
  MEMBERSHIP_STATUS_ACTIVE,
  MEMBERSHIP_STATUS_EXPIRING,
  type CustomerListFilters,
} from '@/customer/filters'
import type { CustomerWithMembership } from '@/customer/types'
import { mapCustomerRow } from '@/customer/utils'
import { UPCOMING_EXPIRATION_WINDOW_DAYS } from '@/membership/consts'
import { getTodayRangeInAppTz } from '@/lib/timezone'
import { normalizeSearchQuery } from '@/lib/utils/text'

export interface FetchCustomersPageOptions extends Partial<CustomerListFilters> {
  page?: number
  pageSize?: number
}

export interface CustomersPage {
  customers: CustomerWithMembership[]
  /**
   * Total de clientes que matchean los filtros, ignorando la paginación.
   *
   * El Figma lo muestra literal abajo a la izquierda del listado ("230 Total de
   * clientes") y lo necesita el paginador para saber cuántas páginas hay, así
   * que el query pide `count: 'exact'`. La primera versión de la Fase 6a no lo
   * pedía porque se creía que el diseño no tenía paginador; la captura del
   * 2026-09-16 mostró que sí.
   */
  total: number
}

/**
 * Límites del día de hoy y de la ventana "por vencer", en el calendario de
 * Argentina. Los tres estados se derivan de comparar `expiration_date` contra
 * estos dos cortes, y son **mutuamente excluyentes a propósito**: una membresía
 * que vence en 3 días es "Por vencer", no "Activa". Si no lo fueran, filtrar por
 * "Activo" devolvería filas con el badge amarillo y el filtro diría una cosa
 * distinta de la que muestra la fila.
 */
function getStatusBoundaries() {
  const { start } = getTodayRangeInAppTz()
  const windowEnd = new Date(start)

  windowEnd.setUTCDate(windowEnd.getUTCDate() + UPCOMING_EXPIRATION_WINDOW_DAYS)

  return { todayStart: start.toISOString(), windowEnd: windowEnd.toISOString() }
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
): Promise<CustomersPage> {
  const from = page * pageSize
  const to = from + pageSize - 1
  // Filtrar por columnas de la membresía embebida exige el join `!inner`.
  const needsMembershipJoin = Boolean(status || membershipType)

  let request = supabase
    .from(CUSTOMERS_LISTING_RELATION)
    .select(needsMembershipJoin ? SEARCH_CUSTOMER_WITH_MEMBERSHIP : SEARCH_CUSTOMER, {
      count: 'exact',
    })
    // Dos grupos, cada uno alfabético: arriba los que asistieron en los últimos
    // `ACTIVE_CUSTOMER_WINDOW_DAYS` días, debajo el resto.
    //
    // El orden alfabético puro ponía primero a gente que no pisa el gimnasio
    // hace años — medido sobre dev, de las primeras 20 filas sólo 3 habían
    // asistido en el último mes y 7 no habían asistido nunca. El corte es por
    // **asistencia y no por membresía** a propósito: quien viene importa haya
    // pagado o no, y de hecho los que vienen sin pagar son justamente los que
    // hay que cobrar. Es el mismo concepto de "señal de vida" que ya usan
    // `getBillingCycleProgress` y `getExpiredMembershipsCount`.
    //
    // Dentro de cada grupo se mantiene el alfabético porque el listado también
    // es un directorio: se busca gente por nombre, y un orden por recencia lo
    // haría impredecible.
    .order('is_recently_active', { ascending: false })
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
    const { todayStart, windowEnd } = getStatusBoundaries()

    if (status === MEMBERSHIP_STATUS_ACTIVE) {
      // Activa "de verdad": vence después de la ventana de aviso. Las que vencen
      // dentro de los próximos días caen en `expiring`, que es su propio estado.
      request = request.gte('customer_membership.expiration_date', windowEnd)
    } else if (status === MEMBERSHIP_STATUS_EXPIRING) {
      request = request
        .gte('customer_membership.expiration_date', todayStart)
        .lt('customer_membership.expiration_date', windowEnd)
    } else {
      // `expiration_date` nulo cuenta como vencida: es lo que devuelve
      // `isExpiredInAppTz(null)`, que es quien decide el badge de la fila. Sin
      // el `is.null` el filtro y el badge dirían cosas distintas de la misma
      // fila. El valor va entre comillas porque el ISO lleva `:` y `.`.
      request = request.or(`expiration_date.is.null,expiration_date.lt."${todayStart}"`, {
        referencedTable: 'customer_membership',
      })
    }
  }

  const { data, count, error } = await request

  if (error) throw error

  return { customers: (data ?? []).map(mapCustomerRow), total: count ?? 0 }
}
