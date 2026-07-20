'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import MoreVerticalIcon from '@/components/icons/more-vertical'
import PencilIcon from '@/components/icons/pencil'
import TrashIcon from '@/components/icons/trash'
import { EXPENSES_EDIT } from '@/consts/routes'
import { deleteExpense } from '@/expenses/api'
import { formatCurrency } from '@/lib/format-currency'
import { formatCalendarDate } from '@/lib/format-date'
import { getCategoryTranslationKey, normalizeCategoryValue } from '@/expenses/utils'
import { useTranslations } from '@/lib/i18n/context'
import type { Expense } from '@/accounting/types'

interface ExpenseRowProps {
  expense: Expense
}

export function ExpenseRow({ expense }: ExpenseRowProps) {
  const { t } = useTranslations()
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const normalizedCategory = normalizeCategoryValue(expense.category)

  const handleDelete = async () => {
    setDeleting(true)
    const response = await deleteExpense(expense.id)

    setDeleting(false)

    if (!response.success) {
      toast.error(response.error || t('accounting.expenses.errors.deleteError'))

      return
    }

    toast.success(t('accounting.expenses.success.deleted'))
    queryClient.invalidateQueries({ queryKey: ['expenses'] })
    queryClient.invalidateQueries({ queryKey: ['monthly-stats'] })
    setConfirmOpen(false)
  }

  return (
    <li className='flex items-center justify-between gap-3 border-b border-white/10 py-3 first:pt-0 last:border-0 last:pb-0'>
      <div className='min-w-0'>
        <p className='font-medium truncate'>{expense.description}</p>
        <p className='text-xs text-muted-foreground mt-0.5'>
          {t(getCategoryTranslationKey(normalizedCategory))} ·{' '}
          {formatCalendarDate(expense.expense_date)}
        </p>
      </div>

      <div className='flex items-center gap-1 shrink-0'>
        <span className='font-semibold whitespace-nowrap'>{formatCurrency(expense.amount)}</span>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger
            aria-label={t('accounting.expenses.actions')}
            className='flex items-center justify-center size-8 shrink-0 rounded-full text-muted-foreground outline-none transition-colors hover:bg-white/10 hover:text-foreground'
          >
            <MoreVerticalIcon className='size-4' />
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem asChild>
              <Link href={`${EXPENSES_EDIT}/${expense.id}`}>
                <PencilIcon className='size-4' />
                {t('common.edit')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem variant='destructive' onSelect={() => setConfirmOpen(true)}>
              <TrashIcon className='size-4' />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className='max-w-[360px]'>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('accounting.expenses.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('accounting.expenses.deleteDialog.description', {
                description: expense.description,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='grid grid-cols-2 gap-4'>
            <AlertDialogCancel className='h-14 rounded-[4px]' disabled={deleting}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className='h-14 rounded-[4px] bg-destructive text-white hover:bg-destructive/90'
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault()
                handleDelete()
              }}
            >
              {t('accounting.expenses.deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}
