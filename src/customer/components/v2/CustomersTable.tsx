'use client'

import { Users } from 'lucide-react'
import DataTable, {
  DataTableAvatar,
  DataTableMobileRow,
  type DataTableColumn,
} from '@/components/v2/DataTable'
import EmptyState from '@/components/v2/EmptyState'
import Button from '@/components/v2/ui/Button'
import StatusBadge from '@/components/v2/ui/StatusBadge'
import type { CustomerWithMembership } from '@/customer/types'
import { formatDate } from '@/lib/format-date'
import { getInitials } from '@/lib/format-person'
import { useTranslations } from '@/lib/i18n/context'
import { isExpiredInAppTz } from '@/lib/timezone'
import { MembershipTranslation, MembershipTranslationWeekly } from '@/membership/consts'

interface CustomersTableProps {
  customers: CustomerWithMembership[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  /** Hay búsqueda o filtros activos: cambia el copy del estado vacío. */
  isFiltered: boolean
  onClearFilters: () => void
}

/**
 * Tabla del listado de clientes.
 *
 * Columnas verificadas contra el Figma (`2118:22308`, captura del 2026-09-16):
 * **Nombre y Apellido · Membresía · Estado · Vencimiento · Asistencias**, con
 * avatar de iniciales en la primera y todo alineado a la izquierda. El chevron
 * que el Figma dibuja al final de cada fila abre el `Customer Detail Modal`, que
 * es Fase 6b — no se agrega hasta que exista, para no dejar una afordancia que
 * no hace nada.
 */
export default function CustomersTable({
  customers,
  isLoading,
  isError,
  onRetry,
  isFiltered,
  onClearFilters,
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
      mobileRow={(customer) => <CustomerMobileRow customer={customer} />}
      rows={customers}
    />
  )
}

function fullName(customer: CustomerWithMembership): string {
  return `${customer.first_name} ${customer.last_name}`.trim()
}

// Sub-componentes

/**
 * Badge de estado de la fila. `customers` no tiene columna de activo/inactivo:
 * el estado se deriva del vencimiento de la membresía, en el día calendario de
 * Argentina. `isExpiredInAppTz(null)` es `true`, así que un cliente con membresía
 * sin fecha cuenta como vencida — la misma regla que aplica el filtro de estado
 * en `customers-query.ts`.
 */
function CustomerStatusBadge({ customer }: { customer: CustomerWithMembership }) {
  const { t } = useTranslations()

  if (!customer.membership_type) {
    return <StatusBadge tone='neutral'>{t('v2.customers.status.none')}</StatusBadge>
  }

  const isExpired = isExpiredInAppTz(customer.expiration_date)

  return (
    <StatusBadge tone={isExpired ? 'danger' : 'success'}>
      {isExpired ? t('v2.customers.status.expired') : t('v2.customers.status.active')}
    </StatusBadge>
  )
}

// Fila mobile con la forma del Figma: avatar de iniciales + nombre +
// "Membresía: 5 días" + badge de estado a la derecha. El subtítulo usa
// `MembershipTranslation` (que ya trae el prefijo) y no la variante "semanales"
// del desktop: son los dos textos que muestran las capturas de cada viewport.
function CustomerMobileRow({ customer }: { customer: CustomerWithMembership }) {
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
    />
  )
}
