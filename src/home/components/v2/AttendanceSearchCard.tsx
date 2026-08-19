'use client'

import { useState } from 'react'
import { Search, LoaderCircle, UserPlus, X } from 'lucide-react'
import Link from 'next/link'
import { useCustomerSearch } from '@/customer/hooks/use-customer-search'
import { useTranslations } from '@/lib/i18n/context'
import type { Customer } from '@/customer/types'
import { CUSTOMER_NEW } from '@/consts/routes'
import AssistanceModal from './AssistanceModal'

const MAX_RESULTS_TO_DISPLAY = 5

export default function AttendanceSearchCard() {
  const { t } = useTranslations()
  const { query, setQuery, debouncedQuery, results, loading } = useCustomerSearch()
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const hasQuery = query.trim().length > 0
  const showDropdown = hasQuery && debouncedQuery.trim().length > 0
  const displayedResults = results.slice(0, MAX_RESULTS_TO_DISPLAY)

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setQuery('')
  }

  const handleClearSelection = () => {
    setSelectedCustomer(null)
  }

  const handleOpenModal = () => {
    if (!selectedCustomer) return
    setModalOpen(true)
  }

  return (
    <>
      <div className='flex flex-col md:flex-row md:items-center gap-3'>
        <div className='relative flex-1'>
          {selectedCustomer ? (
            <SelectedCustomerChip
              customer={selectedCustomer}
              onClear={handleClearSelection}
            />
          ) : (
            <SearchInput
              loading={loading}
              placeholder={t('v2.home.attendanceSearch.placeholder')}
              value={query}
              onChange={setQuery}
            />
          )}
          {showDropdown && !selectedCustomer && (
            <div className='absolute top-full left-0 right-0 mt-2 z-50'>
              <SearchResults
                debouncedQuery={debouncedQuery}
                loading={loading}
                results={displayedResults}
                onSelect={handleSelectCustomer}
              />
            </div>
          )}
        </div>

        <button
          className='px-3 py-2.5 text-sm text-white shrink-0 rounded-xl bg-sidebar-accent hover:bg-sidebar-ring transition-colors hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 font-medium'
          disabled={!selectedCustomer}
          type='button'
          onClick={handleOpenModal}
        >
          {t('v2.home.attendanceSearch.cta')}
        </button>
      </div>

      <AssistanceModal
        customer={selectedCustomer}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setSelectedCustomer(null)
        }}
      />
    </>
  )
}

// Sub-componentes

interface SelectedCustomerChipProps {
  customer: Customer
  onClear: () => void
}

function SelectedCustomerChip({ customer, onClear }: SelectedCustomerChipProps) {
  const { t } = useTranslations()

  return (
    <div className='flex items-center gap-2 bg-[#E5E5E5] rounded-lg px-3 py-2.5 w-full'>
      <span className='text-sm flex-1 truncate'>
        {customer.first_name} {customer.last_name}
      </span>
      <button
        aria-label={t('common.clear')}
        className='shrink-0 text-muted-foreground hover:text-foreground transition-colors hover:cursor-pointer'
        type='button'
        onClick={onClear}
      >
        <X className='size-4' />
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
  onSelect: (customer: Customer) => void
}

function SearchResults({ results, debouncedQuery, loading, onSelect }: SearchResultsProps) {
  const { t } = useTranslations()

  return (
    <ul className='flex flex-col divide-y divide-border rounded-md border bg-background shadow-md'>
      {loading && (
        <li className='px-3 py-2 text-sm text-muted-foreground'>
          {t('v2.home.attendanceSearch.searching')}
        </li>
      )}
      {!loading && results.length === 0 && (
        <li className='px-3 py-2 text-sm text-muted-foreground'>
          {t('v2.home.attendanceSearch.noResults', { query: debouncedQuery })}
        </li>
      )}
      {!loading &&
        results.map((customer) => (
          <li key={customer.id}>
            <button
              className='w-full text-left px-3 py-2 hover:bg-muted transition-colors'
              type='button'
              onClick={() => onSelect(customer)}
            >
              <div className='text-sm font-medium'>
                {customer.first_name} {customer.last_name}
              </div>
              <div className='text-xs text-muted-foreground'>{customer.person_id}</div>
            </button>
          </li>
        ))}
      {/* Crear nuevo cliente — siempre al pie del dropdown */}
      <li>
        <Link
          className='w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors'
          href={CUSTOMER_NEW}
        >
          <UserPlus aria-hidden='true' className='size-4 shrink-0' />
          {t('v2.home.attendanceSearch.createNewCustomer')}
        </Link>
      </li>
    </ul>
  )
}
