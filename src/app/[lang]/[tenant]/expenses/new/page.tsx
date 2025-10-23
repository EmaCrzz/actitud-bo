'use client'

import ArrowLeftIcon from '@/components/icons/arrow-left'
import { Button } from '@/components/ui/button'
import { EXPENSES } from '@/consts/routes'
import ExpenseForm from '@/expenses/components/form'
import { useTranslations } from '@/lib/i18n/context'
import Link from 'next/link'

export default function NewExpensePage() {
  const { t } = useTranslations()

  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
        <div className='flex gap-4 items-center'>
          <Button className='size-6 rounded-full' variant='ghost'>
            <Link href={EXPENSES}>
              <ArrowLeftIcon className='size-6' />
            </Link>
          </Button>
          <h5 className='font-bold text-sm font-headline'>{t('accounting.expenses.new')}</h5>
        </div>
      </header>
      <ExpenseForm />
    </>
  )
}
