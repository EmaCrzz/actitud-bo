'use client'

import { Search, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useCustomerSearch } from '@/customer/hooks/use-customer-search'
import { useTranslations } from '@/lib/i18n/context'
import type { Customer } from '@/customer/types'

const MAX_RESULTS_TO_DISPLAY = 5

export default function AttendanceSearchCard() {
  const { t } = useTranslations()
  const { query, setQuery, debouncedQuery, results, loading } = useCustomerSearch()

  // Placeholder: el modal real de registrar asistencia llega en PR siguiente.
  // Se muestra el mismo toast para el click del CTA y para el click en un
  // resultado del dropdown, para que ambos caminos comuniquen el estado
  // "próximamente" de forma consistente.
  const notifyComingSoon = () => {
    toast(t('v2.home.attendanceSearch.toastComingSoon'), {
      description: t('v2.home.attendanceSearch.toastComingSoonDescription'),
    })
  }

  const hasQuery = query.trim().length > 0
  const showDropdown = hasQuery && debouncedQuery.trim().length > 0
  const displayedResults = results.slice(0, MAX_RESULTS_TO_DISPLAY)

  return (
    <div className='flex flex-col md:flex-row md:items-center gap-3'>
      <div className='relative flex-1'>
        <SearchInput
          loading={loading}
          placeholder={t('v2.home.attendanceSearch.placeholder')}
          value={query}
          onChange={setQuery}
        />
        {showDropdown && (
          <div className='absolute top-full left-0 right-0 mt-2 z-50'>
            <SearchResults
              debouncedQuery={debouncedQuery}
              loading={loading}
              results={displayedResults}
              onSelect={notifyComingSoon}
            />
          </div>
        )}
      </div>
      <button
        className='px-3 py-2.5 text-sm text-white shrink-0 rounded-xl bg-sidebar-accent hover:bg-sidebar-ring transition-colors hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 font-medium'
        type='button'
        onClick={notifyComingSoon}
      >
        {t('v2.home.attendanceSearch.cta')}
      </button>
    </div>
  )
}

interface SearchInputProps {
  value: string
  onChange: (v: string) => void
  placeholder: string
  loading: boolean
}

function SearchInput({ value, onChange, placeholder, loading }: SearchInputProps) {
  return (
    <div className='relative flex-1 items-center'>
      <Search
        aria-hidden='true'
        className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground'
      />
      <input
        aria-busy={loading}
        className='pl-9 bg-[#E5E5E5] w-full px-3 py-2.5 rounded-lg text-sm placeholder:text-muted-foreground'
        placeholder={placeholder}
        // type='search'
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {loading && (
        <LoaderCircle
          aria-hidden='true'
          className='absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin'
        />
      )}
    </div>
  )
}

interface SearchResultsProps {
  results: Customer[]
  debouncedQuery: string
  loading: boolean
  onSelect: () => void
}

function SearchResults({ results, debouncedQuery, loading, onSelect }: SearchResultsProps) {
  const { t } = useTranslations()

  if (loading) {
    return (
      <p className='text-sm text-muted-foreground px-2 py-2 rounded-md border bg-background'>
        {t('v2.home.attendanceSearch.searching')}
      </p>
    )
  }

  if (results.length === 0) {
    return (
      <p className='text-sm text-muted-foreground px-2 py-2 rounded-md border bg-background'>
        {t('v2.home.attendanceSearch.noResults', { query: debouncedQuery })}
      </p>
    )
  }

  return (
    <ul className='flex flex-col divide-y divide-border rounded-md border bg-background shadow-md'>
      {results.map((customer) => (
        <li key={customer.id}>
          <button
            className='w-full text-left px-3 py-2 hover:bg-muted transition-colors'
            type='button'
            onClick={onSelect}
          >
            <div className='text-sm font-medium'>
              {customer.first_name} {customer.last_name}
            </div>
            <div className='text-xs text-muted-foreground'>{customer.person_id}</div>
          </button>
        </li>
      ))}
    </ul>
  )
}
