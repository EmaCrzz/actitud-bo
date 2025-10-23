'use client'

import { useExpenses } from '@/expenses/hooks/use-expenses'
import { formatCurrency } from '@/lib/format-currency'
import { formatDate } from '@/lib/format-date'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { useTranslations } from '@/lib/i18n/context'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { EXPENSES_NEW } from '@/consts/routes'
import PlusRoundedIcon from '@/components/icons/plus-rounded'
import { EXPENSE_CATEGORY_COLORS } from '@/expenses/consts'
import { cn } from '@/lib/utils'
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
          {error instanceof Error ? error.message : 'Error al cargar los gastos'}
        </AlertDescription>
      </Alert>
    )
  }

  if (!expenses || expenses.length === 0) {
    return (
      <div className='text-center py-12 text-muted-foreground'>
        <p>No se encontraron gastos para este período</p>
      </div>
    )
  }

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <section className='grid gap-6'>
      {/* Sticky Total Section */}
      <div className='sticky top-0 z-20 flex pt-2 bg-background pb-0.5'>
        <div className='flex items-center w-full justify-between backdrop-blur-sm p-4 rounded bg-input-background border-[0.5px] border-[#DAD7D8]'>
          <h3 className='text-base font-semibold'>{t('accounting.expenses.totalExpenses')}</h3>
          <div className='text-right'>
            <p className='text-xl font-bold text-red-300'>{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
      </div>

      {/* Expenses List */}
      <div className='p-4 rounded bg-input-background border-[0.5px] border-[#DAD7D8]'>
        <div className='flex items-center justify-between border-b border-primary400 pb-[0.5] mb-3'>
          <h3 className='text-start text-primary400 text-xl font-semibold'>
            {t('accounting.expenses.resume')}
          </h3>
          <Button className='size-8 rounded-full' variant='ghost'>
            <Link href={EXPENSES_NEW}>
              <PlusRoundedIcon className='size-5' />
            </Link>
          </Button>
        </div>

        {expenses.map((expense) => (
          <div
            key={expense.id}
            className='flex items-center justify-between border-b last:border-0 py-3 last:pb-0'
          >
            <div className='flex-1'>
              <h4 className='font-medium'>{expense.description}</h4>
              <div className='flex items-center gap-3 mt-1 text-sm text-muted-foreground'>
                {(() => {
                  const normalizedCategory = normalizeCategoryValue(expense.category)

                  return (
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-md text-xs font-medium',
                        EXPENSE_CATEGORY_COLORS[normalizedCategory]
                      )}
                    >
                      {t(getCategoryTranslationKey(normalizedCategory))}
                    </span>
                  )
                })()}
                <span>{formatDate(expense.expense_date)}</span>
              </div>
              {expense.notes && (
                <p className='text-sm text-muted-foreground mt-1 italic'>{expense.notes}</p>
              )}
            </div>
            <div className='text-right ml-4'>
              <p className='text-lg font-semibold text-red-300'>{formatCurrency(expense.amount)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
