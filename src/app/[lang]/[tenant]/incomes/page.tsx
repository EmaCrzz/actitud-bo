'use client'

import Link from 'next/link'
import ArrowLeftIcon from '@/components/icons/arrow-left'
import MonthSelectorRow from '@/components/month-selector-row'
import { Button } from '@/components/ui/button'
import { ACCOUNTING, STATS } from '@/consts/routes'
import { useMonthNavigation } from '@/lib/hooks/use-month-navigation'
import { useTranslations } from '@/lib/i18n/context'
import type { TranslationKey } from '@/lib/i18n/types'
import useIncomesSummary from '@/accounting/hooks/useIncomesSummary'
import HeroCobrado from '@/accounting/components/incomes/hero-cobrado'
import BillingCycleProgressCard from '@/accounting/components/incomes/billing-cycle-progress'
import ByMembershipType from '@/accounting/components/incomes/by-membership-type'
import PaymentMethodCard from '@/accounting/components/incomes/payment-method-card'
import DiscountsCard from '@/accounting/components/incomes/discounts-card'
import RecentPaymentsFeed from '@/accounting/components/incomes/recent-payments-feed'
import MonthlyComparative from '@/accounting/components/incomes/monthly-comparative'
import { IncomesDashboardSkeleton } from '@/accounting/components/incomes/skeletons'

const MONTH_NAME_KEYS: TranslationKey[] = [
  'months.january',
  'months.february',
  'months.march',
  'months.april',
  'months.may',
  'months.june',
  'months.july',
  'months.august',
  'months.september',
  'months.october',
  'months.november',
  'months.december',
]

function previousMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 }

  return { year, month: month - 1 }
}

export default function IncomesPage() {
  const { t } = useTranslations()
  const { year, month, isCurrentMonth, currentMonthFormatted, goToPreviousMonth, goToNextMonth } =
    useMonthNavigation()
  const { data, isLoading, error } = useIncomesSummary(currentMonthFormatted)

  const monthLabel = t(MONTH_NAME_KEYS[month - 1])
  const prev = previousMonth(year, month)
  const previousMonthLabel = t(MONTH_NAME_KEYS[prev.month - 1])

  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
        <div className='flex gap-4 items-center'>
          <Button className='size-6 rounded-full' variant='ghost'>
            <Link href={`${STATS}${ACCOUNTING}`}>
              <ArrowLeftIcon className='size-6' />
            </Link>
          </Button>
          <h5 className='font-bold text-sm font-headline'>{t('accounting.income.title')}</h5>
        </div>
      </header>

      <section className='max-w-3xl mx-auto w-full px-4 overflow-auto pb-4 flex flex-col gap-y-3'>
        <MonthSelectorRow
          isCurrentMonth={isCurrentMonth}
          month={month}
          year={year}
          onNextMonth={goToNextMonth}
          onPreviousMonth={goToPreviousMonth}
        />

        {isLoading && <IncomesDashboardSkeleton />}

        {error && (
          <p className='text-sm text-red-400 p-4 rounded bg-input-background border-[0.5px] border-[#DAD7D8]'>
            {error.message}
          </p>
        )}

        {data && !isLoading && (
          <>
            <HeroCobrado cobrado={data.cobrado} previousMonthLabel={previousMonthLabel} />
            <BillingCycleProgressCard
              cycle={data.cycle}
              month={currentMonthFormatted}
              monthLabel={monthLabel}
            />
            <ByMembershipType
              data={data.by_membership_type}
              month={currentMonthFormatted}
              monthLabel={monthLabel}
            />
            <div className='grid grid-cols-2 gap-3'>
              <PaymentMethodCard data={data.by_payment_method} />
              <DiscountsCard data={data.discounts} />
            </div>
            <RecentPaymentsFeed payments={data.recent_payments} />
            <MonthlyComparative data={data.last_6_months} />
          </>
        )}
      </section>
    </>
  )
}
