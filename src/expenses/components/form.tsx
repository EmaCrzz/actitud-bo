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
import { UncontrolledDatePicker } from '@/components/uncontrolled-date-picker'
import { EXPENSE_CATEGORIES } from '@/expenses/consts'
import { useTranslations } from '@/lib/i18n/context'
import { getCategoryTranslationKey } from '@/expenses/utils'
import { useQueryClient } from '@tanstack/react-query'
import { getTodayIsoDateInAppTz } from '@/lib/timezone'

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

    // Validación básica
    const newErrors: Record<string, string> = {}

    if (!category) newErrors.category = t('accounting.expenses.validation.categoryRequired')

    if (!amount || amount <= 0)
      newErrors.amount = t('accounting.expenses.validation.amountRequired')

    if (!description)
      newErrors.description = t('accounting.expenses.validation.descriptionRequired')

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
    })

    setLoading(false)

    if (!response.success) {
      toast.error(response.error || t('accounting.expenses.errors.createError'))

      return
    }

    toast.success(t('accounting.expenses.success.created'))

    queryClient.invalidateQueries({ queryKey: ['expenses'] })
    queryClient.invalidateQueries({ queryKey: ['monthly-stats'] })

    router.push(EXPENSES)
  }

  const categoryOptions = EXPENSE_CATEGORIES.map((cat) => ({
    value: cat,
    label: t(getCategoryTranslationKey(cat)),
  }))

  return (
    <>
      <form className='space-y-6' id='form-expense' onSubmit={handleSubmit}>
        <section className='max-w-3xl mx-auto w-full px-4 overflow-auto pb-4 pt-6'>
          <p className='text-xs font-light tracking-wide text-muted-foreground mb-8'>
            {t('accounting.expenses.form.title')}
          </p>

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
              placeholder={t('accounting.expenses.form.selectCategory')}
            />
          </div>

          <div className='grid grid-cols-2 gap-4'>
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
                placeholder='$0,00'
              />
            </div>

            <div className='space-y-2'>
              <Label className='font-light' htmlFor='expense_date'>
                {t('accounting.expenses.form.date')}
              </Label>
              <UncontrolledDatePicker
                dateFormat='short'
                defaultValue={getTodayIsoDateInAppTz()}
                id='expense_date'
                isDisabled={loading}
                name='expense_date'
              />
            </div>
          </div>

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
              placeholder={t('accounting.expenses.form.descriptionPlaceholder')}
            />
          </div>
        </section>
      </form>
      <footer className='flex flex-col max-w-3xl gap-3 mx-auto w-full px-4 pb-9'>
        <Button className='w-full h-12' form='form-expense' loading={loading} type='submit'>
          {t('common.confirm')}
        </Button>
        <Button
          className='w-full h-12'
          disabled={loading}
          type='button'
          variant='outline'
          onClick={() => router.push(EXPENSES)}
        >
          {t('common.cancel')}
        </Button>
      </footer>
    </>
  )
}
