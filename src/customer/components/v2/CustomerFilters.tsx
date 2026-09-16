'use client'

import FilterDropdown from '@/components/v2/FilterDropdown'
import {
  FILTER_ALL,
  MEMBERSHIP_STATUS_ACTIVE,
  MEMBERSHIP_STATUS_EXPIRED,
  MEMBERSHIP_STATUS_EXPIRING,
  type MembershipStatusFilter,
} from '@/customer/filters'
import { useTranslations } from '@/lib/i18n/context'
import {
  MembershipTranslationWeekly,
  MembershipTypeArray,
  type MembershipTypes,
} from '@/membership/consts'

interface CustomerFiltersProps {
  status: MembershipStatusFilter | null
  membershipType: MembershipTypes | null
  onStatusChange: (status: MembershipStatusFilter | null) => void
  onMembershipTypeChange: (membershipType: MembershipTypes | null) => void
}

/**
 * Los dos `Dropdown` del listado de clientes: **Estado** y **Membresías**.
 *
 * Verificados contra la captura del Figma del 2026-09-16 (`2118:22308`), que
 * confirmó la inferencia previa: son los dos ejes que el resto de la pantalla ya
 * expone — el badge de cada fila y la columna Membresía. El trigger muestra el
 * nombre del filtro mientras no hay nada aplicado; el label largo ("Todos los
 * estados") sólo aparece dentro de la lista.
 */
export default function CustomerFilters({
  status,
  membershipType,
  onStatusChange,
  onMembershipTypeChange,
}: CustomerFiltersProps) {
  const { t } = useTranslations()

  return (
    <>
      <FilterDropdown
        allLabel={t('v2.customers.filters.statusAll')}
        // Más angosto que el default: su contenido más largo es "Por vencer".
        className='sm:w-40'
        label={t('v2.customers.filters.statusLabel')}
        options={[
          { value: MEMBERSHIP_STATUS_ACTIVE, label: t('v2.customers.status.active') },
          { value: MEMBERSHIP_STATUS_EXPIRING, label: t('v2.customers.status.expiring') },
          { value: MEMBERSHIP_STATUS_EXPIRED, label: t('v2.customers.status.expired') },
          // Los otros dos estados del Figma. Ver `customer/filters.ts`: no hay
          // columna en `customers` que los soporte ni definición de qué los
          // separa, así que se listan apagados en vez de filtrar por una regla
          // inventada.
          {
            value: 'inactive',
            label: `${t('v2.customers.filters.statusInactive')} · ${t('v2.customers.filters.statusUnavailable')}`,
            disabled: true,
          },
          {
            value: 'unsubscribed',
            label: `${t('v2.customers.filters.statusUnsubscribed')} · ${t('v2.customers.filters.statusUnavailable')}`,
            disabled: true,
          },
        ]}
        value={status ?? FILTER_ALL}
        onChange={(value) =>
          onStatusChange(value === FILTER_ALL ? null : (value as MembershipStatusFilter))
        }
      />
      <FilterDropdown
        allLabel={t('v2.customers.filters.typeAll')}
        label={t('v2.customers.filters.typeLabel')}
        options={MembershipTypeArray.map((type) => ({
          value: type,
          label: t(MembershipTranslationWeekly[type]),
        }))}
        value={membershipType ?? FILTER_ALL}
        onChange={(value) =>
          onMembershipTypeChange(value === FILTER_ALL ? null : (value as MembershipTypes))
        }
      />
    </>
  )
}
