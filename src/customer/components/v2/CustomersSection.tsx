'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useDebounce } from 'use-debounce'
import { useIntersectionObserver } from 'usehooks-ts'
import { Plus } from 'lucide-react'
import FilterBar from '@/components/v2/FilterBar'
import PageHeader from '@/components/v2/PageHeader'
import Button from '@/components/v2/ui/Button'
import { useComingSoonToast } from '@/components/v2/use-coming-soon-toast'
import { fetchCustomersPage } from '@/customer/api/client'
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
import CustomersTable from './CustomersTable'

const SEARCH_DEBOUNCE_MS = 400

interface CustomersSectionProps {
  /** Primera página, ya filtrada, resuelta por el server component. */
  initialCustomers: CustomerWithMembership[]
  /** Filtros con los que el server resolvió `initialCustomers`. */
  initialFilters: CustomerListFilters
}

export default function CustomersSection({
  initialCustomers,
  initialFilters,
}: CustomersSectionProps) {
  const { t } = useTranslations()
  const notifyComingSoon = useComingSoonToast()

  const [queryInput, setQueryInput] = useState(initialFilters.query)
  const [status, setStatus] = useState<MembershipStatusFilter | null>(initialFilters.status)
  const [membershipType, setMembershipType] = useState<MembershipTypes | null>(
    initialFilters.membershipType
  )
  const [debouncedQuery] = useDebounce(queryInput, SEARCH_DEBOUNCE_MS)

  const filters = useMemo<CustomerListFilters>(
    () => ({ query: debouncedQuery, status, membershipType }),
    [debouncedQuery, status, membershipType]
  )

  const {
    data,
    isError,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['customers', 'v2', 'list', filters],
    queryFn: ({ pageParam }) => fetchCustomersPage({ ...filters, page: pageParam }),
    initialPageParam: 0,
    // Una página incompleta significa que no hay más: no pedimos `count` a
    // Postgres para saber el total, porque el Figma no muestra paginador ni
    // contador de resultados (decisión #4 del plan v2).
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < CUSTOMERS_PAGE_SIZE ? undefined : allPages.length,
    // La primera página ya vino del server. Sólo sirve mientras los filtros sean
    // los que el server usó; en cuanto cambian, cambia la query key y react-query
    // consulta de verdad.
    initialData: areSameCustomerFilters(filters, initialFilters)
      ? { pages: [initialCustomers], pageParams: [0] }
      : undefined,
  })

  const customers = useMemo(() => data?.pages.flat() ?? [], [data])
  const isFiltered = hasActiveCustomerFilters(filters)
  const isInitialLoading = isFetching && !isFetchingNextPage && customers.length === 0

  // La URL refleja los filtros para que la vista sea compartible y recargable, y
  // para que el card del home pueda linkear acá ya filtrado.
  //
  // `history.replaceState` en vez de `router.replace`: éste último re-ejecuta el
  // server component y vuelve a traer la primera página que react-query ya tiene
  // en cache. Next 15 soporta este patrón para updates de URL sin navegación.
  useEffect(() => {
    const queryString = customerFiltersToQueryString(filters)
    const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}`

    if (nextUrl !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, '', nextUrl)
    }
  }, [filters])

  const { ref: sentinelRef } = useIntersectionObserver({
    threshold: 0,
    rootMargin: '200px',
    onChange: (isIntersecting) => {
      if (isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
  })

  const handleClearFilters = useCallback(() => {
    setQueryInput('')
    setStatus(null)
    setMembershipType(null)
  }, [])

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4 lg:gap-6'>
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
            onClick={notifyComingSoon}
          >
            <Plus aria-hidden className='size-4' />
            <span className='hidden sm:inline'>{t('v2.customers.newCustomer')}</span>
          </Button>
        }
        search={
          <FilterBar.Search
            placeholder={t('v2.customers.searchPlaceholder')}
            value={queryInput}
            onChange={setQueryInput}
          />
        }
      >
        <CustomerFilters
          membershipType={membershipType}
          status={status}
          onMembershipTypeChange={setMembershipType}
          onStatusChange={setStatus}
        />
      </FilterBar>

      <div className='min-h-0 flex-1 overflow-y-auto'>
        <CustomersTable
          customers={customers}
          isError={isError}
          isFiltered={isFiltered}
          isLoading={isInitialLoading}
          onClearFilters={handleClearFilters}
          onRetry={() => refetch()}
        />

        {/* Scroll infinito: el Figma no dibuja paginador. El sentinel va dentro
            del contenedor scrolleable, si no nunca entra en viewport. */}
        {hasNextPage && (
          <div ref={sentinelRef} className='py-4 text-center text-sm text-muted-foreground'>
            {isFetchingNextPage ? t('v2.customers.loadingMore') : ''}
          </div>
        )}
      </div>
    </div>
  )
}
