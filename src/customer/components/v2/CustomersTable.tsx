'use client'

import { ChevronRight, Users } from 'lucide-react'
import DataTable, {
  DataTableAvatar,
  DataTableMobileRow,
  type DataTableColumn,
} from '@/components/v2/DataTable'
import EmptyState from '@/components/v2/EmptyState'
import Button from '@/components/v2/ui/Button'
import StatusBadge from '@/components/v2/ui/StatusBadge'
import type { CustomerWithMembership } from '@/customer/types'
import { getCustomerMembershipStatus } from '@/customer/utils'
import { formatDate } from '@/lib/format-date'
import { getInitials } from '@/lib/format-person'
import { useTranslations } from '@/lib/i18n/context'
import { MembershipTranslation, MembershipTranslationWeekly } from '@/membership/consts'
import { CUSTOMER_STATUS_LABEL, CUSTOMER_STATUS_TONE } from './customer-status'

interface CustomersTableProps {
  customers: CustomerWithMembership[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  /** Hay búsqueda o filtros activos: cambia el copy del estado vacío. */
  isFiltered: boolean
  onClearFilters: () => void
  /** Abre el panel "Perfil del cliente". Lo dispara el chevron y la fila entera. */
  onSelectCustomer: (customer: CustomerWithMembership) => void
}

/**
 * Tabla del listado de clientes.
 *
 * Columnas verificadas contra el Figma (`2118:22308`, captura del 2026-09-16):
 * **Nombre y Apellido · Membresía · Estado · Vencimiento · Asistencias**, con
 * avatar de iniciales en la primera y todo alineado a la izquierda, más el
 * chevron del final que abre el Perfil del cliente.
 */
export default function CustomersTable({
  customers,
  isLoading,
  isError,
  onRetry,
  isFiltered,
  onClearFilters,
  onSelectCustomer,
}: CustomersTableProps) {
  const { t } = useTranslations()

  const columns: DataTableColumn<CustomerWithMembership>[] = [
    {
      id: 'name',
      header: t('v2.customers.columns.name'),
      cell: (customer) => {
        const name = fullName(customer)

        return (
          <div className='flex items-center gap-3'>
            <DataTableAvatar initials={getInitials(name)} />
            <span className='font-medium'>{name}</span>
          </div>
        )
      },
    },
    {
      id: 'membership',
      header: t('v2.customers.columns.membership'),
      cell: (customer) =>
        customer.membership_type ? (
          t(MembershipTranslationWeekly[customer.membership_type])
        ) : (
          <span className='text-muted-foreground'>{t('v2.customers.row.noMembership')}</span>
        ),
    },
    {
      id: 'status',
      header: t('v2.customers.columns.status'),
      cell: (customer) => <CustomerStatusBadge customer={customer} />,
    },
    {
      id: 'expiration',
      header: t('v2.customers.columns.expiration'),
      cell: (customer) => (customer.expiration_date ? formatDate(customer.expiration_date) : '—'),
    },
    {
      id: 'attendances',
      header: t('v2.customers.columns.attendances'),
      cell: (customer) => customer.assistance_count ?? 0,
    },
    {
      id: 'open',
      header: '',
      align: 'right',
      className: 'w-12',
      // La fila entera es clickeable, pero un `<tr onClick>` no se alcanza con
      // teclado. El chevron es un botón de verdad para que el perfil también se
      // abra con Tab + Enter; frena la propagación para no disparar dos veces.
      cell: (customer) => (
        <button
          aria-label={t('common.viewCustomer')}
          className='rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground hover:cursor-pointer'
          type='button'
          onClick={(event) => {
            event.stopPropagation()
            onSelectCustomer(customer)
          }}
        >
          <ChevronRight aria-hidden className='size-4' />
        </button>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      empty={
        isFiltered ? (
          <EmptyState
            action={
              <Button size='sm' type='button' variant='outlined' onClick={onClearFilters}>
                {t('v2.customers.noResults.clearFilters')}
              </Button>
            }
            description={t('v2.customers.noResults.description')}
            icon={<Users aria-hidden className='size-6' />}
            title={t('v2.customers.noResults.title')}
          />
        ) : (
          <EmptyState
            description={t('v2.customers.empty.description')}
            icon={<Users aria-hidden className='size-6' />}
            title={t('v2.customers.empty.title')}
          />
        )
      }
      error={
        isError ? (
          <EmptyState
            action={
              <Button size='sm' type='button' variant='outlined' onClick={onRetry}>
                {t('v2.customers.error.retry')}
              </Button>
            }
            description={t('v2.customers.error.description')}
            icon={<Users aria-hidden className='size-6' />}
            title={t('v2.customers.error.title')}
          />
        ) : undefined
      }
      getRowId={(customer) => customer.id}
      isLoading={isLoading}
      mobileRow={(customer) => (
        <CustomerMobileRow customer={customer} onSelect={() => onSelectCustomer(customer)} />
      )}
      rows={customers}
      onRowClick={onSelectCustomer}
    />
  )
}

function fullName(customer: CustomerWithMembership): string {
  return `${customer.first_name} ${customer.last_name}`.trim()
}

// Sub-componentes

/**
 * Badge de estado de la fila. `customers` no tiene columna de activo/inactivo:
 * el estado se deriva del vencimiento de la membresía en el día calendario de
 * Argentina, con `getCustomerMembershipStatus` — la **misma** función que
 * replica los cortes del `WHERE` de `customers-query.ts`, para que el filtro y
 * el badge no puedan decir cosas distintas de la misma fila.
 */
function CustomerStatusBadge({ customer }: { customer: CustomerWithMembership }) {
  const { t } = useTranslations()
  const status = getCustomerMembershipStatus(customer)

  return (
    <StatusBadge tone={CUSTOMER_STATUS_TONE[status]}>{t(CUSTOMER_STATUS_LABEL[status])}</StatusBadge>
  )
}

// Fila mobile con la forma del Figma: avatar de iniciales + nombre +
// "Membresía: 5 días" + badge de estado a la derecha. El subtítulo usa
// `MembershipTranslation` (que ya trae el prefijo) y no la variante "semanales"
// del desktop: son los dos textos que muestran las capturas de cada viewport.
function CustomerMobileRow({
  customer,
  onSelect,
}: {
  customer: CustomerWithMembership
  onSelect: () => void
}) {
  const { t } = useTranslations()
  const name = fullName(customer)

  return (
    <DataTableMobileRow
      badge={<CustomerStatusBadge customer={customer} />}
      initials={getInitials(name)}
      subtitle={
        customer.membership_type
          ? t(MembershipTranslation[customer.membership_type])
          : t('v2.customers.row.noMembership')
      }
      title={name}
      onClick={onSelect}
    />
  )
}
