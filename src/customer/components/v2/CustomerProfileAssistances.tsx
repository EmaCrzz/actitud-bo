'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import Button from '@/components/v2/ui/Button'
import { fetchCustomerAssistances } from '@/assistance/api/client'
import { formatDate, formatTimeInAppTz } from '@/lib/format-date'
import { useTranslations } from '@/lib/i18n/context'

/** Cuántas asistencias trae cada tanda. El panel es angosto: no entran muchas. */
const PAGE_SIZE = 10

/**
 * Tab "Asistencias" del Perfil del cliente: historial con fecha y hora, y los
 * dos contadores del pie — total histórico y mes en curso.
 *
 * El historial crece sin techo (un cliente de dos años tiene cientos), así que
 * se pide de a tandas con un "Ver más" en vez de traerlo entero. No usa el
 * paginador numerado: es una lista dentro de un panel, no una tabla.
 */
export default function CustomerProfileAssistances({ customerId }: { customerId: string }) {
  const { t } = useTranslations()
  const [limit, setLimit] = useState(PAGE_SIZE)

  const { data, isPending, isError, isFetching } = useQuery({
    queryKey: ['customer', 'v2', 'assistances', customerId, limit],
    queryFn: () => fetchCustomerAssistances(customerId, { limit }),
    // Al pedir la tanda siguiente, las filas ya visibles se quedan en pantalla
    // en vez de parpadear al skeleton.
    placeholderData: keepPreviousData,
  })

  if (isPending) return <AssistancesSkeleton />
  if (isError) {
    return (
      <p className='py-2 text-sm text-muted-foreground'>
        {t('v2.customers.profile.assistances.error')}
      </p>
    )
  }

  const { assistances, total, currentMonth } = data
  const hasMore = assistances.length < total

  return (
    <div className='flex flex-col'>
      {assistances.length === 0 ? (
        <p className='py-2 text-sm text-muted-foreground'>
          {t('v2.customers.profile.assistances.empty')}
        </p>
      ) : (
        <ul className='flex flex-col'>
          {assistances.map((assistance) => (
            <li
              key={assistance.id}
              className='flex items-center justify-between gap-3 border-b py-2.5 text-sm last:border-b-0'
            >
              <span className='text-muted-foreground'>
                {t('v2.customers.profile.assistances.date')}{' '}
                <span className='text-foreground'>{formatDate(assistance.assistance_date)}</span>
              </span>
              <span className='shrink-0 text-muted-foreground'>
                {formatTimeInAppTz(assistance.assistance_date)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <Button
          className='mt-3 self-center'
          disabled={isFetching}
          size='sm'
          type='button'
          variant='outlined'
          onClick={() => setLimit((current) => current + PAGE_SIZE)}
        >
          {t('v2.customers.profile.assistances.loadMore')}
        </Button>
      )}

      <div className='mt-4 flex items-center justify-between gap-3 border-t pt-3 text-sm'>
        <span className='font-medium'>
          {t('v2.customers.profile.assistances.total', { total })}
        </span>
        <span className='text-muted-foreground'>
          {t('v2.customers.profile.assistances.currentMonth', { total: currentMonth })}
        </span>
      </div>
    </div>
  )
}

// Sub-componentes

function AssistancesSkeleton() {
  return (
    <div aria-busy className='flex flex-col gap-3'>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className='flex items-center justify-between gap-3'>
          <Skeleton className='h-4 w-40' />
          <Skeleton className='h-4 w-12' />
        </div>
      ))}
    </div>
  )
}
