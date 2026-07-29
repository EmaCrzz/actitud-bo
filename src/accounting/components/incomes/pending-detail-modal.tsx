'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDate } from '@/lib/format-date'
import { useTranslations } from '@/lib/i18n/context'
import useIncomesPending from '@/accounting/hooks/useIncomesPending'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMembershipLabel } from './format-membership-label'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  month: string
  monthLabel: string
}

export default function PendingDetailModal({ open, onOpenChange, month, monthLabel }: Props) {
  const { t } = useTranslations()
  const { data, isLoading, error } = useIncomesPending(month, open)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[85vh] flex flex-col p-4 gap-0'>
        <DialogHeader className='mb-3 text-left'>
          <DialogTitle className='text-base'>
            {t('accounting.income.dashboard.pendingModalTitle', { month: monthLabel })}
          </DialogTitle>
          <DialogDescription className='text-xs'>
            {t('accounting.income.dashboard.pendingModalSubtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className='overflow-y-auto flex-1 -mx-4 px-4'>
          {isLoading && (
            <ul className='flex flex-col gap-2'>
              {Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className='py-2 border-b border-white/10 last:border-0'>
                  <Skeleton className='h-4 w-40 mb-1' />
                  <Skeleton className='h-3 w-32' />
                </li>
              ))}
            </ul>
          )}
          {error && <p className='text-sm text-red-400'>{error.message}</p>}
          {data && data.length === 0 && (
            <p className='text-sm text-muted-foreground'>
              {t('accounting.income.dashboard.pendingModalEmpty')}
            </p>
          )}
          {data && data.length > 0 && (
            <ul className='flex flex-col'>
              {data.map((c) => {
                const typeLabel = formatMembershipLabel(c.membership_type, t)

                return (
                  <li
                    key={c.customer_id}
                    className='py-3 border-b border-white/10 first:pt-0 last:border-0 last:pb-0'
                  >
                    <p className='text-sm'>
                      {c.first_name} {c.last_name}
                    </p>
                    <p className='text-xs text-muted-foreground mt-0.5 capitalize'>
                      {typeLabel} ·{' '}
                      {t('accounting.income.dashboard.pendingExpiredOn', {
                        date: formatDate(c.expiration_date),
                      })}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
