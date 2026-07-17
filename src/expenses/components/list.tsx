'use client'

import { useExpenses } from '@/expenses/hooks/use-expenses'
import { formatCurrency } from '@/lib/format-currency'
import { formatDate } from '@/lib/format-date'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { useTranslations } from '@/lib/i18n/context'
import Link from 'next/link'
import { EXPENSES_NEW } from '@/consts/routes'
import PlusIcon from '@/components/icons/plus'
import { getCategoryTranslationKey, normalizeCategoryValue } from '@/expenses/utils'
import { ExpenseListSkeleton } from './skeletons'

interface ExpensesListProps {
  month?: string
  category?: string
}

export default function ExpensesList({ month, category }: ExpensesListProps) {
  const { t } = useTranslations()
  const { data: expenses, isLoading, error } = useExpenses({ month, category })

  if (isLoading) {
    return <ExpenseListSkeleton />
  }

  if (error) {
    return (
      <Alert variant='destructive'>
        <AlertTriangle className='h-4 w-4' />
        <AlertDescription>
          {error instanceof Error ? error.message : t('accounting.expenses.errors.loadError')}
        </AlertDescription>
      </Alert>
    )
  }

  const items = expenses ?? []
  const isEmpty = items.length === 0
  const totalExpenses = items.reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <section className='grid gap-8 pt-2'>
      {/* Total del mes */}
      <p className='text-center font-headline font-bold text-3xl'>
        {formatCurrency(totalExpenses)}
      </p>

      {/* Resumen de gastos */}
      <div className='p-4 rounded bg-input-background border-[0.5px] border-[#DAD7D8]'>
        <div className='flex items-center justify-between border-b border-primary400 pb-2 mb-3'>
          <h3 className='text-start text-primary400 text-xl font-semibold'>
            {t('accounting.expenses.resume')}
          </h3>
          <Link
            aria-label={t('accounting.expenses.new')}
            className='flex items-center justify-center size-8 shrink-0 rounded-full bg-secondary700 text-white transition-colors hover:bg-secondary600'
            href={EXPENSES_NEW}
          >
            <PlusIcon className='size-4' />
          </Link>
        </div>

        {isEmpty ? (
          <p className='text-center py-6 text-muted-foreground'>{t('accounting.expenses.empty')}</p>
        ) : (
          <ul>
            {items.map((expense) => {
              const normalizedCategory = normalizeCategoryValue(expense.category)

              return (
                <li
                  key={expense.id}
                  className='flex items-center justify-between gap-4 border-b border-white/10 py-3 first:pt-0 last:border-0 last:pb-0'
                >
                  <div className='min-w-0'>
                    <p className='font-medium truncate'>{expense.description}</p>
                    <p className='text-xs text-muted-foreground mt-0.5'>
                      {t(getCategoryTranslationKey(normalizedCategory))} ·{' '}
                      {formatDate(expense.expense_date)}
                    </p>
                  </div>
                  <span className='font-semibold whitespace-nowrap'>
                    {formatCurrency(expense.amount)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
