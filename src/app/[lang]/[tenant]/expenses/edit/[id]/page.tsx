import ArrowLeftIcon from '@/components/icons/arrow-left'
import { Button } from '@/components/ui/button'
import { EXPENSES } from '@/consts/routes'
import ExpenseForm from '@/expenses/components/form'
import { getExpenseById } from '@/accounting/api/server'
import { getServerT } from '@/lib/i18n/server'
import Link from 'next/link'

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { t } = await getServerT()
  const expense = await getExpenseById(id)

  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
        <div className='flex gap-4 items-center'>
          <Button className='size-6 rounded-full' variant='ghost'>
            <Link href={EXPENSES}>
              <ArrowLeftIcon className='size-6' />
            </Link>
          </Button>
          <h5 className='font-bold text-sm font-headline'>{t('accounting.expenses.edit')}</h5>
        </div>
      </header>
      {expense ? (
        <ExpenseForm expense={expense} />
      ) : (
        <div className='max-w-3xl mx-auto w-full px-4 py-6'>
          <h2 className='text-lg font-semibold'>{t('accounting.expenses.notFound')}</h2>
        </div>
      )}
    </>
  )
}
