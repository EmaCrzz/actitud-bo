'use client'

import { CalendarX, SearchX } from 'lucide-react'
import EmptyState from '@/components/v2/EmptyState'
import Button from '@/components/v2/ui/Button'
import { Skeleton } from '@/components/ui/skeleton'
import { getAssistanceMembershipType, type AssistanceByDate } from '@/assistance/utils'
import { MembershipTranslation, type MembershipTypes } from '@/membership/consts'
import { formatTimeInAppTz } from '@/lib/format-date'
import { getInitials } from '@/lib/format-person'
import { useTranslations } from '@/lib/i18n/context'

interface AttendanceListProps {
  assistances: AssistanceByDate[]
  /** La consulta falló: es distinto de un día sin asistencias. */
  failed?: boolean
  /** Hay una navegación de día en curso. */
  isLoading?: boolean
  /** Reintento del estado de error. */
  onRetry?: () => void
  /** Cambia el copy del vacío: un día pasado sin nadie no es lo mismo que hoy. */
  isToday?: boolean
  /**
   * Hay una búsqueda activa.
   *
   * Cambia el vacío por "sin resultados": decirle "todavía no vino nadie" a
   * alguien que acaba de filtrar por un apellido es falso, y encima le esconde
   * que lo que tiene que hacer es borrar la búsqueda.
   */
  isFiltered?: boolean
}

/**
 * Lista de asistencias de un día.
 *
 * No usa `DataTable`: el Figma no dibuja una tabla en ninguno de los dos
 * viewports — ni headers de columna ni filas `<tr>` en desktop. Es la misma
 * lista de filas apiladas en 390 y en 1280, así que forzarla dentro del
 * componente de tabla significaría pasarle un `columns` que nunca se pinta.
 *
 * La fila sigue la anatomía canónica del rediseño (avatar con iniciales +
 * nombre + línea secundaria) con una diferencia deliberada: **donde el resto de
 * las listas lleva un badge de estado, ésta lleva la hora**. Es lo que dibuja el
 * diseño y tiene sentido — en la lista de un día puntual lo que se consulta es a
 * qué hora entró alguien, no si su membresía vence pronto.
 */
export default function AttendanceList({
  assistances,
  failed = false,
  isLoading = false,
  onRetry,
  isToday = false,
  isFiltered = false,
}: AttendanceListProps) {
  const { t } = useTranslations()

  if (isLoading) return <AttendanceListSkeleton />

  if (failed) {
    return (
      <EmptyState
        action={
          onRetry && (
            <Button size='sm' variant='outlined' onClick={onRetry}>
              {t('v2.attendance.error.retry')}
            </Button>
          )
        }
        description={t('v2.attendance.error.description')}
        icon={<CalendarX className='size-5' />}
        title={t('v2.attendance.error.title')}
      />
    )
  }

  if (assistances.length === 0) {
    if (isFiltered) {
      return (
        <EmptyState
          description={t('v2.attendance.noResults.description')}
          icon={<SearchX className='size-5' />}
          title={t('v2.attendance.noResults.title')}
        />
      )
    }

    return (
      <EmptyState
        description={
          isToday
            ? t('v2.attendance.empty.todayDescription')
            : t('v2.attendance.empty.dayDescription')
        }
        icon={<CalendarX className='size-5' />}
        title={t('v2.attendance.empty.title')}
      />
    )
  }

  // El `id` es el ancla de los tests: `getByRole('listitem')` a secas también
  // matchearía los ítems del menú lateral, y el conteo de filas dejaría de
  // significar lo que dice. El skeleton no lo lleva a propósito — mientras
  // carga no hay filas que contar.
  return (
    <ul className='divide-y divide-border' id='attendance-list'>
      {assistances.map((assistance) => (
        <AttendanceRow key={assistance.id} assistance={assistance} />
      ))}
    </ul>
  )
}

function AttendanceRow({ assistance }: { assistance: AssistanceByDate }) {
  const { t } = useTranslations()
  const { first_name: firstName, last_name: lastName } = assistance.customers
  const fullName = `${firstName} ${lastName}`.trim()
  const membershipType = getAssistanceMembershipType(assistance)

  // El tipo viene de la DB como string. Sólo se traduce si está en el catálogo:
  // un plan dado de baja en `types_memberships` dejaría una key sin entrada en
  // el diccionario y `t()` devolvería la key cruda en pantalla.
  const membershipLabel =
    membershipType && membershipType in MembershipTranslation
      ? t(MembershipTranslation[membershipType as MembershipTypes])
      : t('v2.attendance.row.noMembership')

  return (
    <li className='flex items-center gap-3 py-3'>
      <span
        aria-hidden='true'
        className='flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground'
      >
        {getInitials(fullName)}
      </span>
      <div className='min-w-0 flex-1'>
        <p className='truncate text-sm font-medium'>{fullName}</p>
        <p className='truncate text-sm text-muted-foreground'>{membershipLabel}</p>
      </div>
      <time
        className='shrink-0 text-sm text-muted-foreground'
        dateTime={assistance.assistance_date}
      >
        {formatTimeInAppTz(assistance.assistance_date)}
      </time>
    </li>
  )
}

function AttendanceListSkeleton() {
  return (
    <ul className='divide-y divide-border'>
      {[0, 1, 2, 3, 4].map((index) => (
        <li key={index} className='flex items-center gap-3 py-3'>
          <Skeleton className='size-9 shrink-0 rounded-full' />
          <div className='min-w-0 flex-1 space-y-1.5'>
            <Skeleton className='h-4 w-40' />
            <Skeleton className='h-3.5 w-16' />
          </div>
          <Skeleton className='h-4 w-10 shrink-0' />
        </li>
      ))}
    </ul>
  )
}
