'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useDebounce } from 'use-debounce'
import { Plus } from 'lucide-react'
import DataTablePagination from '@/components/v2/DataTablePagination'
import FilterBar from '@/components/v2/FilterBar'
import PageHeader from '@/components/v2/PageHeader'
import Button from '@/components/v2/ui/Button'
import { fetchCustomersPage } from '@/customer/api/client'
import type { CustomersPage } from '@/customer/api/customers-query'
import { CUSTOMERS_PAGE_SIZE } from '@/customer/consts'
import {
  areSameCustomerFilters,
  customerFiltersToQueryString,
  hasActiveCustomerFilters,
  type CustomerListFilters,
  type MembershipStatusFilter,
} from '@/customer/filters'
import type { CustomerWithMembership } from '@/customer/types'
import { useTranslations } from '@/lib/i18n/context'
import type { MembershipTypes } from '@/membership/consts'
import CustomerFilters from './CustomerFilters'
import CustomerFormPanel from './CustomerFormPanel'
import CustomerProfilePanel from './CustomerProfilePanel'
import CustomersTable from './CustomersTable'

const SEARCH_DEBOUNCE_MS = 400

interface CustomersSectionProps {
  /** Primera página pedida, ya filtrada, resuelta por el server component. */
  initialPage: CustomersPage
  /** Filtros con los que el server resolvió `initialPage`. */
  initialFilters: CustomerListFilters
  /** Página (0-indexed) con la que el server resolvió `initialPage`. */
  initialPageIndex: number
  /** Ver `CustomerProfilePayments`: finanzas es admin-only a nivel RLS. */
  canReadPayments: boolean
}

export default function CustomersSection({
  initialPage,
  initialFilters,
  initialPageIndex,
  canReadPayments,
}: CustomersSectionProps) {
  const { t } = useTranslations()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [queryInput, setQueryInput] = useState(initialFilters.query)
  const [status, setStatus] = useState<MembershipStatusFilter | null>(initialFilters.status)
  const [membershipType, setMembershipType] = useState<MembershipTypes | null>(
    initialFilters.membershipType
  )
  const [page, setPage] = useState(initialPageIndex)
  const [debouncedQuery] = useDebounce(queryInput, SEARCH_DEBOUNCE_MS)

  // Cliente cuyo perfil está abierto. Se conserva al cerrar el panel para que la
  // animación de salida no se quede sin contenido a mitad de camino.
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithMembership | null>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const filters = useMemo<CustomerListFilters>(
    () => ({ query: debouncedQuery, status, membershipType }),
    [debouncedQuery, status, membershipType]
  )

  const { data, isError, isFetching, isPlaceholderData, refetch } = useQuery({
    queryKey: ['customers', 'v2', 'list', filters, page],
    queryFn: () => fetchCustomersPage({ ...filters, page }),
    // La página anterior queda en pantalla mientras llega la nueva: sin esto,
    // cada click del paginador vacía la tabla al skeleton y la altura salta.
    placeholderData: keepPreviousData,
    initialData:
      areSameCustomerFilters(filters, initialFilters) && page === initialPageIndex
        ? initialPage
        : undefined,
  })

  const customers = data?.customers ?? []
  const total = data?.total ?? 0
  const isFiltered = hasActiveCustomerFilters(filters)
  const isInitialLoading = isFetching && !isPlaceholderData && customers.length === 0

  // Cambiar un filtro reinicia la paginación: quedarse en la página 7 de un
  // listado que ahora tiene 2 páginas mostraría vacío sin explicar por qué.
  const resetToFirstPage = useCallback(() => setPage(0), [])

  const handleQueryChange = useCallback(
    (value: string) => {
      setQueryInput(value)
      resetToFirstPage()
    },
    [resetToFirstPage]
  )

  const handleStatusChange = useCallback(
    (value: MembershipStatusFilter | null) => {
      setStatus(value)
      resetToFirstPage()
    },
    [resetToFirstPage]
  )

  const handleMembershipTypeChange = useCallback(
    (value: MembershipTypes | null) => {
      setMembershipType(value)
      resetToFirstPage()
    },
    [resetToFirstPage]
  )

  const handleClearFilters = useCallback(() => {
    setQueryInput('')
    setStatus(null)
    setMembershipType(null)
    resetToFirstPage()
  }, [resetToFirstPage])

  const handleSelectCustomer = useCallback((customer: CustomerWithMembership) => {
    setSelectedCustomer(customer)
    setIsProfileOpen(true)
  }, [])

  // La URL refleja filtros y página para que la vista sea compartible y
  // recargable, y para que el card del home pueda linkear acá ya filtrado.
  //
  // `history.replaceState` en vez de `router.replace`: éste último re-ejecuta el
  // server component y vuelve a traer una página que react-query ya tiene en
  // cache. Next 15 soporta este patrón para updates de URL sin navegación.
  useEffect(() => {
    const queryString = customerFiltersToQueryString(filters, page)
    const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}`

    if (nextUrl !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, '', nextUrl)
    }
  }, [filters, page])

  return (
    // `md:min-h-0` y no `min-h-0`: en mobile el default `min-height: auto` es lo
    // que impide que esta columna se encoja por debajo de su contenido y lo deje
    // desbordando fuera del card. En desktop sí se encoge, porque ahí el scroll
    // es interno (ver el wrapper de la tabla más abajo).
    <div className='flex flex-1 flex-col gap-4 md:min-h-0 lg:gap-6'>
      <PageHeader subtitle={t('v2.customers.subtitle')} title={t('v2.customers.title')} />

      <FilterBar
        action={
          // En el Figma esta acción es un botón con texto y un `+` en desktop, y
          // el `New Client Button` de 40×36 icon-only en mobile, al lado del
          // search (convención 2.1 del plan).
          <Button
            aria-label={t('v2.customers.newCustomer')}
            className='w-9 px-0 sm:w-auto sm:px-4'
            type='button'
            onClick={() => setIsFormOpen(true)}
          >
            <Plus aria-hidden className='size-4' />
            <span className='hidden sm:inline'>{t('v2.customers.newCustomer')}</span>
          </Button>
        }
        search={
          <FilterBar.Search
            placeholder={t('v2.customers.searchPlaceholder')}
            value={queryInput}
            onChange={handleQueryChange}
          />
        }
      >
        <CustomerFilters
          membershipType={membershipType}
          status={status}
          onMembershipTypeChange={handleMembershipTypeChange}
          onStatusChange={handleStatusChange}
        />
      </FilterBar>

      {/* Desktop: ventana de scroll propia, con FilterBar y paginador fijos.
       * Mobile: sin `min-h-0` ni `overflow`, así la lista empuja el card y
       * scrollea el `<main>` del AppShell de una sola vez. */}
      <div className='flex-1 md:min-h-0 md:overflow-y-auto'>
        <CustomersTable
          customers={customers}
          isError={isError}
          isFiltered={isFiltered}
          isLoading={isInitialLoading}
          onClearFilters={handleClearFilters}
          onRetry={() => refetch()}
          onSelectCustomer={handleSelectCustomer}
        />
      </div>

      {!isError && (
        <DataTablePagination
          page={page}
          pageSize={CUSTOMERS_PAGE_SIZE}
          summary={t('v2.customers.totalLabel', { total })}
          total={total}
          onPageChange={setPage}
        />
      )}

      <CustomerFormPanel
        open={isFormOpen}
        onCreated={() => {
          // El alta puede caer en cualquier página del listado según el orden y
          // los filtros activos, así que se vuelve a la primera y se refetchea
          // en vez de intentar insertar la fila nueva en la página en pantalla.
          resetToFirstPage()
          refetch()
        }}
        onOpenChange={setIsFormOpen}
      />

      <CustomerProfilePanel
        canReadPayments={canReadPayments}
        customer={selectedCustomer}
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
      />
    </div>
  )
}
