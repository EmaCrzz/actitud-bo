import CourseUp from '@/components/icons/course-up'
import CourseDown from '@/components/icons/corse-down'
import { formatCurrency } from '@/lib/format-currency'
import { useTranslations } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'
import type { IncomesCobrado } from '@/accounting/types'
import CardHeader from './card-header'

interface Props {
  cobrado: IncomesCobrado
  previousMonthLabel: string
}

export default function HeroCobrado({ cobrado, previousMonthLabel }: Props) {
  const { t } = useTranslations()
  const { total, payments_count, average, delta_vs_previous_pct } = cobrado
  const hasDelta = delta_vs_previous_pct !== null
  const isPositive = hasDelta && delta_vs_previous_pct >= 0
  const deltaLabel = hasDelta
    ? `${isPositive ? '+' : ''}${delta_vs_previous_pct.toFixed(1)}%`
    : null

  return (
    <div className='p-4 rounded bg-input-background border-[0.5px] border-[#DAD7D8]'>
      <CardHeader
        subtitle={t('accounting.income.dashboard.cobradoSubtitle')}
        title={t('accounting.income.dashboard.cobradoTitle')}
      />
      <p className='font-headline font-semibold text-3xl mb-3'>{formatCurrency(total)}</p>
      {hasDelta && (
        <p
          className={cn(
            'text-sm flex items-center gap-2 mb-3',
            isPositive ? 'text-green-400' : 'text-red-400'
          )}
        >
          {isPositive ? (
            <CourseUp className='size-4' />
          ) : (
            <CourseDown className='size-4' />
          )}
          <span>
            {deltaLabel}{' '}
            <span className='text-muted-foreground'>
              {t('accounting.income.dashboard.vsMonth', { month: previousMonthLabel })}
            </span>
          </span>
        </p>
      )}
      <p className='text-xs text-muted-foreground'>
        {t('accounting.income.dashboard.paymentsAndAverage', {
          count: String(payments_count),
          average: formatCurrency(average),
        })}
      </p>
    </div>
  )
}
