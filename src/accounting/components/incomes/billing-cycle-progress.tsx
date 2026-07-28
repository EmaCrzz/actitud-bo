'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useTranslations } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'
import { getCyclePhaseForDay } from '@/accounting/billing-policy'
import type { BillingCycleProgress } from '@/accounting/types'
import CardHeader from './card-header'
import PendingDetailModal from './pending-detail-modal'

interface Props {
  cycle: BillingCycleProgress
  month: string
  monthLabel: string
}

export default function BillingCycleProgressCard({ cycle, month, monthLabel }: Props) {
  const [pendingOpen, setPendingOpen] = useState(false)
  const { t } = useTranslations()
  const {
    denominator,
    paid_count,
    paid_with_surcharge,
    pending_count,
    current_day_of_month,
  } = cycle

  if (denominator === 0) {
    return (
      <div className='p-4 rounded bg-input-background border-[0.5px] border-[#DAD7D8]'>
        <CardHeader title={t('accounting.income.dashboard.cycleTitle', { month: monthLabel })} />
        <p className='text-sm text-muted-foreground'>
          {t('accounting.income.dashboard.cycleEmpty')}
        </p>
      </div>
    )
  }

  const percent = Math.min(100, Math.round((paid_count / denominator) * 100))
  const phase = current_day_of_month
    ? getCyclePhaseForDay(current_day_of_month)
    : null
  const isSurchargePhase = phase === 'surcharge'
  const allPaid = pending_count === 0
  const barColor = allPaid
    ? 'bg-green-400'
    : isSurchargePhase
      ? 'bg-yellow-400'
      : 'bg-primary400'

  return (
    <div className='p-4 rounded bg-input-background border-[0.5px] border-[#DAD7D8]'>
      <CardHeader title={t('accounting.income.dashboard.cycleTitle', { month: monthLabel })} />

      <div className='w-full h-3 rounded-full bg-white/10 overflow-hidden mb-3'>
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className='text-sm mb-4'>
        <span className='font-semibold'>{percent}%</span>
        <span className='text-muted-foreground'>
          {' · '}
          {t('accounting.income.dashboard.cyclePaidSummary', {
            paid: paid_count,
            denominator,
          })}
        </span>
      </p>

      {phase && (
        <p className='text-xs text-muted-foreground mb-3'>
          {t(
            isSurchargePhase
              ? 'accounting.income.dashboard.cyclePhaseSurcharge'
              : 'accounting.income.dashboard.cyclePhaseGrace',
            { day: current_day_of_month ?? 0 }
          )}
        </p>
      )}

      <div className='border-t border-white/10 pt-3 flex flex-col gap-2 text-xs'>
        {isSurchargePhase && paid_with_surcharge > 0 && (
          <p className='flex items-center gap-2'>
            <span className='size-2 rounded-full bg-yellow-400' />
            {t('accounting.income.dashboard.cyclePaidWithSurcharge', {
              count: paid_with_surcharge,
            })}
          </p>
        )}
        {pending_count > 0 && (
          <button
            aria-label={t('accounting.income.dashboard.pendingCta')}
            className={cn(
              'flex items-center gap-2 w-full text-left rounded p-1 -m-1 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary400',
              isSurchargePhase ? 'text-yellow-400' : 'text-muted-foreground'
            )}
            type='button'
            onClick={() => setPendingOpen(true)}
          >
            <span
              className={cn(
                'size-2 rounded-full',
                isSurchargePhase ? 'bg-yellow-400' : 'bg-white/40'
              )}
            />
            <span className='flex-1'>
              {t('accounting.income.dashboard.cyclePending', { count: pending_count })}
            </span>
            <ChevronRight className='size-4 shrink-0' />
          </button>
        )}
        {allPaid && (
          <p className='text-green-400 flex items-center gap-2'>
            <span className='size-2 rounded-full bg-green-400' />
            {t('accounting.income.dashboard.cycleAllPaid')}
          </p>
        )}
      </div>

      <PendingDetailModal
        month={month}
        monthLabel={monthLabel}
        open={pendingOpen}
        onOpenChange={setPendingOpen}
      />
    </div>
  )
}
