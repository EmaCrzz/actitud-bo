'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/format-currency'
import { formatDate } from '@/lib/format-date'
import { useTranslations } from '@/lib/i18n/context'
import { PaymentsTranslation, type PaymentType } from '@/membership/consts'
import { Skeleton } from '@/components/ui/skeleton'
import useIncomesByType from '@/accounting/hooks/useIncomesByType'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  month: string
  monthLabel: string
  membershipType: string | null
  typeLabel: string
}

export default function ByTypeDetailModal({
  open,
  onOpenChange,
  month,
  monthLabel,
  membershipType,
  typeLabel,
}: Props) {
  const { t } = useTranslations()
  const { data, isLoading, error } = useIncomesByType(month, membershipType, open)
  const clientsCount = data?.length ?? 0
  const paymentsCount = data?.reduce((sum, g) => sum + g.payments.length, 0) ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[85vh] flex flex-col p-4 gap-0'>
        <DialogHeader className='mb-3 text-left'>
          <DialogTitle className='text-base capitalize'>
            {typeLabel} · {monthLabel}
          </DialogTitle>
          <DialogDescription className='text-xs'>
            {data
              ? t('accounting.income.dashboard.byTypeModalSummary', {
                  clients: clientsCount,
                  payments: paymentsCount,
                })
              : t('accounting.income.dashboard.byTypeModalLoading')}
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
              {t('accounting.income.dashboard.byTypeModalEmpty')}
            </p>
          )}
          {data && data.length > 0 && (
            <ul className='flex flex-col'>
              {data.map((group) => {
                const isPowerUser = group.payments.length > 1

                return (
                  <li
                    key={group.customer_id}
                    className='py-3 border-b border-white/10 first:pt-0 last:border-0 last:pb-0'
                  >
                    <div className='flex items-baseline justify-between gap-2'>
                      <p className='text-sm'>
                        {group.first_name} {group.last_name}
                        {isPowerUser && (
                          <span className='ml-2 text-[11px] px-1.5 py-0.5 rounded bg-primary400/20 text-primary400'>
                            x{group.payments.length}
                          </span>
                        )}
                      </p>
                      <p className='text-sm font-semibold shrink-0'>
                        {formatCurrency(group.total_amount)}
                      </p>
                    </div>
                    <ul className='mt-1 flex flex-col gap-0.5'>
                      {group.payments.map((p) => {
                        const methodKey = PaymentsTranslation[p.payment_method as PaymentType]
                        const methodLabel = methodKey ? t(methodKey) : p.payment_method

                        return (
                          <li
                            key={p.id}
                            className='text-xs text-muted-foreground capitalize flex justify-between gap-2'
                          >
                            <span>
                              {formatDate(p.payment_date)} · {methodLabel}
                            </span>
                            <span>{formatCurrency(p.amount)}</span>
                          </li>
                        )
                      })}
                    </ul>
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
