'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LoaderCircle, Search } from 'lucide-react'
import { useDebounce } from 'use-debounce'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTableAvatar } from '@/components/v2/DataTable'
import Input from '@/components/v2/ui/Input'
import StatusBadge from '@/components/v2/ui/StatusBadge'
import { fetchCustomersPage } from '@/customer/api/client'
import { CUSTOMER_STATUS_LABEL, CUSTOMER_STATUS_TONE } from '@/customer/components/v2/customer-status'
import type { CustomerWithMembership } from '@/customer/types'
import { getCustomerMembershipStatus } from '@/customer/utils'
import { getInitials } from '@/lib/format-person'
import { useTranslations } from '@/lib/i18n/context'
import { MembershipTranslationShort } from '@/membership/consts'

const SEARCH_DEBOUNCE_MS = 400
const MAX_RESULTS = 8

interface Props {
  onSelect: (customer: CustomerWithMembership) => void
}

/**
 * Paso previo del flow de renovación cuando **no** se viene de una ficha
 * (entrada desde el home).
 *
 * Es la única diferencia real entre las 10 pantallas del flow "Desde el home"
 * del Figma y las 7 de "Desde Cliente/Perfil": las tres de más son esto.
 *
 * Usa `fetchCustomersPage` —el query canónico del listado de la Fase 6a— y no
 * `useCustomerSearch`, que es el de la búsqueda de asistencias. El motivo es la
 * fila: el diseño la dibuja con el plan y el badge de estado, y
 * `useCustomerSearch` devuelve `Customer` pelado, sin membresía. Traerla por
 * este lado además hace que el estado que se ve acá sea **el mismo** que el del
 * listado y el del perfil, que salen del mismo cálculo.
 */
export default function RenewCustomerSearchStep({ onSelect }: Props) {
  const { t } = useTranslations()
  const [query, setQuery] = useState('')
  const [debouncedQuery] = useDebounce(query, SEARCH_DEBOUNCE_MS)

  const trimmed = debouncedQuery.trim()

  const { data, isFetching } = useQuery({
    queryKey: ['customers', 'v2', 'renew-search', trimmed],
    queryFn: () => fetchCustomersPage({ query: trimmed, status: null, membershipType: null, page: 0 }),
    enabled: trimmed.length > 0,
  })

  const results = (data?.customers ?? []).slice(0, MAX_RESULTS)

  return (
    <div className='flex flex-col gap-4'>
      <div className='relative'>
        <Search
          aria-hidden
          className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2'
        />
        <Input
          aria-busy={isFetching}
          aria-label={t('v2.membership.renew.search.label')}
          className='pl-9'
          placeholder={t('v2.membership.renew.search.placeholder')}
          type='search'
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {isFetching && (
          <LoaderCircle
            aria-hidden
            className='text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin'
          />
        )}
      </div>

      {!trimmed ? (
        <p className='text-muted-foreground py-2 text-sm'>
          {t('v2.membership.renew.search.prompt')}
        </p>
      ) : isFetching && results.length === 0 ? (
        <div aria-busy className='flex flex-col gap-2'>
          <Skeleton className='h-14 w-full rounded-lg' />
          <Skeleton className='h-14 w-full rounded-lg' />
          <Skeleton className='h-14 w-full rounded-lg' />
        </div>
      ) : results.length === 0 ? (
        <p className='text-muted-foreground py-2 text-sm'>
          {t('v2.membership.renew.search.noResults', { query: trimmed })}
        </p>
      ) : (
        <ul className='flex flex-col gap-1'>
          {results.map((customer) => (
            <li key={customer.id}>
              <CustomerRow customer={customer} onSelect={onSelect} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Sub-componentes

function CustomerRow({
  customer,
  onSelect,
}: {
  customer: CustomerWithMembership
  onSelect: (customer: CustomerWithMembership) => void
}) {
  const { t } = useTranslations()
  const name = `${customer.first_name} ${customer.last_name}`.trim()
  const status = getCustomerMembershipStatus(customer)

  return (
    <button
      className='hover:bg-muted flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:cursor-pointer'
      type='button'
      onClick={() => onSelect(customer)}
    >
      <DataTableAvatar initials={getInitials(name)} />
      <span className='flex min-w-0 flex-1 flex-col'>
        <span className='truncate text-sm font-medium'>{name}</span>
        <span className='text-muted-foreground truncate text-xs'>
          {customer.membership_type
            ? t('v2.membership.renew.currentPlan', {
                plan: t(MembershipTranslationShort[customer.membership_type]),
              })
            : t('v2.customers.row.noMembership')}
        </span>
      </span>
      <StatusBadge tone={CUSTOMER_STATUS_TONE[status]}>
        {t(CUSTOMER_STATUS_LABEL[status])}
      </StatusBadge>
    </button>
  )
}
