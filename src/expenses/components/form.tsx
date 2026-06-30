'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createExpense } from '@/expenses/api'
import { EXPENSES } from '@/consts/routes'
import { InputCurrency } from '@/components/ui/input-currency'
import { HybridSelect } from '@/components/ui/select-hybrid'
import { EXPENSE_CATEGORIES } from '@/expenses/consts'
import { useTranslations } from '@/lib/i18n/context'
import { Textarea } from '@/components/ui/textarea'
import { getCategoryTranslationKey } from '@/expenses/utils'
import { useQueryClient } from '@tanstack/react-query'

export default function ExpenseForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { t } = useTranslations()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})
    setLoading(true)

    const formData = new FormData(event.currentTarget)
    const description = formData.get('description') as string
    const amount = parseFloat(formData.get('amount') as string)
    const category = formData.get('category') as string
    const expense_date = formData.get('expense_date') as string
    const notes = formData.get('notes') as string

    // Validación básica
    const newErrors: Record<string, string> = {}

    if (!description)
      newErrors.description = t('accounting.expenses.validation.descriptionRequired')

    if (!amount || amount <= 0)
      newErrors.amount = t('accounting.expenses.validation.amountRequired')

    if (!category) newErrors.category = t('accounting.expenses.validation.categoryRequired')

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setLoading(false)

      return
    }

    const response = await createExpense({
      description,
      amount,
      category,
      expense_date: expense_date || undefined,
      notes: notes || undefined,
    })

    setLoading(false)

    if (!response.success) {
      toast.error(response.error || t('accounting.expenses.errors.createError'))

      return
    }

    toast.success(t('accounting.expenses.success.created'))

    // Invalidate expenses queries to refetch data
    queryClient.invalidateQueries({ queryKey: ['expenses'] })

    router.push(EXPENSES)
  }

  const categoryOptions = EXPENSE_CATEGORIES.map((cat) => ({
    value: cat,
    label: t(getCategoryTranslationKey(cat)),
  }))

  return (
    <>
      <form className='space-y-6' id='form-expense' onSubmit={handleSubmit}>
        <section className='max-w-3xl mx-auto w-full px-4 overflow-auto pb-4 pt-12'>
          <h3 className='text-sm sm:text-md mb-4'>{t('accounting.expenses.form.title')}</h3>
          <div className='space-y-2'>
            <Label className='font-light' htmlFor='description'>
              {t('accounting.expenses.form.description')}
            </Label>
            <Input
              autoFocus
              disabled={loading}
              helperText={errors.description}
              id='description'
              isInvalid={!!errors.description}
              name='description'
            />
          </div>

          <div className='space-y-2'>
            <Label className='font-light' htmlFor='amount'>
              {t('accounting.expenses.form.amount')}
            </Label>
            <InputCurrency
              helperText={errors.amount}
              id='amount'
              isDisabled={loading}
              isInvalid={!!errors.amount}
              minValue={0}
              name='amount'
            />
          </div>

          <div className='space-y-2'>
            <Label className='font-light' htmlFor='category'>
              {t('accounting.expenses.form.category')}
            </Label>
            <HybridSelect
              helperText={errors.category}
              isDisabled={loading}
              isInvalid={!!errors.category}
              name='category'
              options={categoryOptions}
            />
          </div>

          <div className='space-y-2'>
            <Label className='font-light' htmlFor='expense_date'>
              {t('accounting.expenses.form.date')}
            </Label>
            <Input
              defaultValue={new Date().toISOString().split('T')[0]}
              disabled={loading}
              id='expense_date'
              name='expense_date'
              type='date'
            />
          </div>

          <div className='space-y-2'>
            <Label className='font-light' htmlFor='notes'>
              {t('accounting.expenses.form.notes')}
            </Label>
            <Textarea disabled={loading} id='notes' name='notes' />
          </div>
        </section>
      </form>
      <footer className='flex justify-between max-w-3xl gap-2 mx-auto w-full px-4 pb-9'>
        <Button
          className='w-full h-12 sm:w-44 sm:h-14'
          form='form-expense'
          loading={loading}
          type='submit'
        >
          {t('common.confirm')}
        </Button>
      </footer>
    </>
  )
}
