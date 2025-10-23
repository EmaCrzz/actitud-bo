'use client'

import { useTranslations } from '@/lib/i18n/context'
import useMonthlyStats from '../hooks/useMonthlyStats'
import { CardResumeSkeleton } from './skeletons'
import { formatCurrency } from '@/lib/format-currency'
import CourseUp from '@/components/icons/course-up'
import CourseDown from '@/components/icons/corse-down'
import DiagramUp from '@/components/icons/diagram-up'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import EyeIcon from '@/components/icons/eye'
import { EXPENSES, INCOMES } from '@/consts/routes'

interface StatsSummaryProps {
  month?: string
}

export default function StatsSummary({ month }: StatsSummaryProps) {
  const { t } = useTranslations()
  const { data: stats, isLoading } = useMonthlyStats({ month })
  const balanceTitle = t('accounting.balance.title')
  const expensesTitle = t('accounting.expenses.title')
  const incomeTitle = t('accounting.income.title')
  const currentMonth = stats?.[0]
  const income = currentMonth?.total_income || 0
  const expenses = currentMonth?.total_expenses || 0
  const balance = income - expenses

  if (isLoading) {
    return (
      <section className='grid gap-3'>
        <CardResumeSkeleton title={incomeTitle} />
        <CardResumeSkeleton title={expensesTitle} />
        <CardResumeSkeleton title={balanceTitle} />
      </section>
    )
  }

  if(income === 0 && expenses === 0) {
    return (
      <section className='grid gap-3'>
        No existen datos para este mes.
      </section>
    )
  }

  return (
    <section className='grid gap-3'>
      <div className='p-4 rounded bg-input-background border-[0.5px] border-[#DAD7D8]'>
        <div className='flex items-center justify-between border-b border-primary400 pb-[0.5] mb-6'>
          <h3 className='text-start text-primary400 text-xl font-semibold'>{incomeTitle}</h3>
          <Button className='size-8 rounded-full' variant='ghost'>
            <Link href={INCOMES}>
              <EyeIcon className='size-6' />
            </Link>
          </Button>
        </div>
        <p className='font-headline font-semibold text-2xl text-start'>
          {formatCurrency(income)} <CourseUp className='inline-block ml-2 mb-1 text-green-400' />
        </p>
      </div>
      <div className='p-4 rounded bg-input-background border-[0.5px] border-[#DAD7D8]'>
        <div className='flex items-center justify-between border-b border-primary400 pb-[0.5] mb-6'>
          <h3 className='text-start text-primary400 text-xl font-semibold'>{expensesTitle}</h3>
          <Button className='size-8 rounded-full' variant='ghost'>
            <Link href={EXPENSES}>
              <EyeIcon className='size-6' />
            </Link>
          </Button>
        </div>
        <p className='font-headline font-semibold text-2xl text-start'>
          {formatCurrency(expenses)} <CourseDown className='inline-block ml-2 mb-1 text-red-400' />
        </p>
      </div>
      <div className='p-4 rounded bg-input-background border-[0.5px] border-[#DAD7D8]'>
        <h3 className='text-start text-primary400 text-xl font-semibold border-b pb-[0.5] mb-6'>
          {balanceTitle}
        </h3>
        <p className={`font-headline font-semibold text-2xl text-start`}>
          {formatCurrency(balance)} <DiagramUp className='inline-block ml-2 mb-1 text-blue-400' />
        </p>
      </div>
    </section>
  )
}
