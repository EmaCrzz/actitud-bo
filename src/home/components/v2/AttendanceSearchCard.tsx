'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, LoaderCircle, UserPlus, X } from 'lucide-react'
import { usePermissions } from '@/auth/hooks/use-permissions'
import { useCustomerSearch } from '@/customer/hooks/use-customer-search'
import { useTranslations } from '@/lib/i18n/context'
import Button from '@/components/v2/ui/Button'
import CustomerFormPanel from '@/customer/components/v2/CustomerFormPanel'
import CustomerProfilePanel from '@/customer/components/v2/CustomerProfilePanel'
import type { Customer } from '@/customer/types'
import RenewMembershipPanel from '@/membership/components/v2/RenewMembershipPanel'
import AssistanceModal from './AssistanceModal'

const MAX_RESULTS_TO_DISPLAY = 5

export default function AttendanceSearchCard() {
  const { t } = useTranslations()
  const router = useRouter()
  const { query, setQuery, debouncedQuery, results, loading } = useCustomerSearch()
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [newCustomerOpen, setNewCustomerOpen] = useState(false)
  // El perfil y la renovación trabajan sobre su propia copia del cliente: cerrar
  // el modal limpia `selectedCustomer`, y los paneles que lo reemplazan lo
  // siguen necesitando. Se conserva al cerrar para que la animación de salida
  // no se quede sin contenido, como en `CustomersSection`.
  const [profileCustomer, setProfileCustomer] = useState<Customer | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [renewOpen, setRenewOpen] = useState(false)
  // Ver `CustomerProfilePayments`: finanzas es admin-only a nivel RLS.
  const { isAdmin } = usePermissions()

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

  // El alta acá es un desvío: el operador vino a registrar una asistencia y el
  // cliente no estaba. Al volver queda seleccionado, así el siguiente click es
  // el CTA de asistencia y no volver a tipear el nombre.
  //
  // El refresh es por lo mismo que en `QuickActionsSection`: el alta mueve las
  // métricas del home, que se resuelven en server components.
  // "Ver perfil" reemplaza el modal por el perfil de v2 en vez de navegar: el
  // perfil no tiene URL propia, y quien atiende el mostrador no pierde el home.
  // Desde ahí "Renovar" reemplaza al perfil, que es lo que pide el aviso de
  // membresía vencida del modal ("entrá al perfil del cliente").
  const handleViewProfile = () => {
    if (!selectedCustomer) return
    setProfileCustomer(selectedCustomer)
    setModalOpen(false)
    setSelectedCustomer(null)
    setProfileOpen(true)
  }

  const handleCustomerCreated = (customer?: Customer) => {
    if (customer) {
      setSelectedCustomer(customer)
      setQuery('')
    }
    router.refresh()
  }

  return (
    <>
      <div className='flex flex-col md:flex-row md:items-center gap-3'>
        <div className='relative flex-1'>
          {selectedCustomer ? (
            <SelectedCustomerChip customer={selectedCustomer} onClear={handleClearSelection} />
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
                onCreateNew={() => setNewCustomerOpen(true)}
                onSelect={handleSelectCustomer}
              />
            </div>
          )}
        </div>

        <Button
          className='shrink-0'
          disabled={!selectedCustomer}
          type='button'
          onClick={handleOpenModal}
        >
          {t('v2.home.attendanceSearch.cta')}
        </Button>
      </div>

      <AssistanceModal
        customer={selectedCustomer}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setSelectedCustomer(null)
        }}
        onViewProfile={handleViewProfile}
      />

      <CustomerProfilePanel
        canReadPayments={isAdmin}
        customer={profileCustomer}
        open={profileOpen}
        onOpenChange={setProfileOpen}
        onRenew={() => {
          setProfileOpen(false)
          setRenewOpen(true)
        }}
      />

      <RenewMembershipPanel
        customer={profileCustomer}
        open={renewOpen}
        onOpenChange={setRenewOpen}
        // La renovación mueve las métricas del home, que salen de server
        // components — mismo motivo que el refresh del alta de acá abajo.
        onRenewed={() => router.refresh()}
      />

      <CustomerFormPanel
        open={newCustomerOpen}
        onCreated={handleCustomerCreated}
        onOpenChange={setNewCustomerOpen}
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
  onCreateNew: () => void
}

function SearchResults({
  results,
  debouncedQuery,
  loading,
  onSelect,
  onCreateNew,
}: SearchResultsProps) {
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
      {/* Crear nuevo cliente — siempre al pie del dropdown.
          Abre el panel de alta de la v2 (Fase 7) en vez de navegar al form de
          v1: el alta desde el home es un desvío dentro del flow de asistencia,
          y sacar al operador de la v2 a mitad de camino lo obligaba a volver
          atrás y rehacer la búsqueda. */}
      <li>
        <button
          className='w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors'
          type='button'
          onClick={onCreateNew}
        >
          <UserPlus aria-hidden='true' className='size-4 shrink-0' />
          {t('v2.home.attendanceSearch.createNewCustomer')}
        </button>
      </li>
    </ul>
  )
}
