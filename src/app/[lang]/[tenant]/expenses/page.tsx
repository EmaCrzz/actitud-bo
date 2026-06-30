'use client'

import ArrowLeftIcon from '@/components/icons/arrow-left'
import { Button } from '@/components/ui/button'
import { ACCOUNTING, STATS } from '@/consts/routes'
import ExpensesList from '@/expenses/components/list'
import { useMonthNavigation } from '@/lib/hooks/use-month-navigation'
import MonthSelectorRow from '@/components/month-selector-row'
import { useTranslations } from '@/lib/i18n/context'
import Link from 'next/link'

export default function ExpensesPage() {
  const { t } = useTranslations()
  const { year, month, isCurrentMonth, currentMonthFormatted, goToPreviousMonth, goToNextMonth } =
    useMonthNavigation()

  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
        <div className='flex gap-4 items-center'>
          <Button className='size-6 rounded-full' variant='ghost'>
            <Link href={`${STATS}${ACCOUNTING}`}>
              <ArrowLeftIcon className='size-6' />
            </Link>
          </Button>
          <h5 className='font-bold text-sm font-headline'>{t('accounting.expenses.title')}</h5>
        </div>
      </header>
      <section className='max-w-3xl mx-auto w-full px-4 overflow-auto pb-4'>
        <MonthSelectorRow
          isCurrentMonth={isCurrentMonth}
          month={month}
          year={year}
          onNextMonth={goToNextMonth}
          onPreviousMonth={goToPreviousMonth}
        />
        <ExpensesList month={currentMonthFormatted} />
      </section>
    </>
  )
}
