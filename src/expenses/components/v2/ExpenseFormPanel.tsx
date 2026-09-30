'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleCheck, Loader2 } from 'lucide-react'
import Button from '@/components/v2/ui/Button'
import ConfirmDialog from '@/components/v2/ConfirmDialog'
import DatePicker from '@/components/v2/ui/DatePicker'
import FormField from '@/components/v2/FormField'
import InputCurrency from '@/components/v2/ui/InputCurrency'
import SidePanel from '@/components/v2/SidePanel'
import Textarea from '@/components/v2/ui/Textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/v2/ui/Select'
import { useTranslations } from '@/lib/i18n/context'
import { getTodayIsoDateInAppTz, toAppTzIsoDate } from '@/lib/timezone'
import { PaymentTypeArray, PaymentsTranslation } from '@/membership/consts'
import { createExpense, deleteExpense, updateExpense } from '@/expenses/api'
import { EXPENSE_CATEGORIES } from '@/expenses/consts'
import { getCategoryTranslationKey, normalizeCategoryValue } from '@/expenses/utils'
import type { Expense } from '@/accounting/types'

/** Cuánto queda el cartel de éxito antes de cerrar el panel. */
const SUCCESS_DISMISS_MS = 1200

interface FormState {
  category: string
  description: string
  amount: number
  date: string
  paymentMethod: string
}

interface ExpenseFormPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` = crear. El panel distingue por esto, no por un flag aparte. */
  expense: Expense | null
  onSaved: () => void
}

/**
 * Alta y edición de un gasto, en un solo panel.
 *
 * Mismo criterio que `PlanFormPanel` de la Fase 10: las capturas del
 * 2026-09-29 dibujan "Nuevo gasto" y "Editar gasto" con **los mismos cinco
 * campos en el mismo orden**, y lo único que cambia es el pie —`Cancelar` pasa
 * a `Eliminar`— y los valores precargados. Dos componentes para eso sería
 * garantizar que dentro de unos meses difieran en algo que nadie decidió.
 */
export default function ExpenseFormPanel({
  open,
  onOpenChange,
  expense,
  onSaved,
}: ExpenseFormPanelProps) {
  const { t } = useTranslations()
  const isEdit = expense != null

  const [form, setForm] = useState<FormState>(() => emptyForm())
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<'created' | 'updated' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Se resetea al abrir, no al montar: el panel vive montado entre aperturas y
  // sin esto la segunda edición arrancaría con los datos de la primera.
  useEffect(() => {
    if (!open) return

    setForm(expense ? formFromExpense(expense) : emptyForm())
    setErrors({})
    setSubmitError(null)
    setSuccess(null)
    setConfirmDelete(false)
  }, [open, expense])

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => onOpenChange(false), SUCCESS_DISMISS_MS)

    return () => clearTimeout(timer)
  }, [success, onOpenChange])

  const categoryOptions = useMemo(
    () =>
      EXPENSE_CATEGORIES.map((category) => ({
        value: category,
        label: t(getCategoryTranslationKey(category)),
      })),
    [t]
  )

  const validate = useCallback((): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {}

    if (!form.category) next.category = t('v2.expenses.errors.categoryRequired')
    if (!form.description.trim()) next.description = t('v2.expenses.errors.descriptionRequired')
    if (!(form.amount > 0)) next.amount = t('v2.expenses.errors.amountRequired')
    if (!form.date) next.date = t('v2.expenses.errors.dateRequired')

    // `paymentMethod` no se valida a propósito. Es el mismo criterio que la
    // migración: la columna es nullable porque hay gastos que legítimamente no
    // tienen medio de pago —los 29 previos a esta fase y los reintegros que
    // inserta el RPC de renovación— y obligar a elegir uno acá convertiría
    // editar cualquiera de esos en inventar el dato. Lo que no se especifica
    // se ve: el KPI muestra cuánta plata quedó sin clasificar.
    setErrors(next)

    return Object.keys(next).length === 0
  }, [form, t])

  const handleSubmit = useCallback(async () => {
    if (!validate()) return

    setLoading(true)
    setSubmitError(null)

    const payload = {
      category: form.category,
      description: form.description.trim(),
      amount: form.amount,
      // El string del datepicker viaja como "YYYY-MM-DD" y lo canonicaliza
      // `withCanonicalExpenseDate` en el server. Mandarlo ya convertido acá
      // sería canonicalizarlo dos veces.
      expense_date: form.date,
      payment_method: form.paymentMethod || null,
    }

    const result = isEdit
      ? await updateExpense({ id: expense.id, ...payload })
      : await createExpense(payload)

    setLoading(false)

    if (!result.success) {
      setSubmitError(t('v2.expenses.errors.saveFailed'))

      return
    }

    setSuccess(isEdit ? 'updated' : 'created')
    onSaved()
  }, [expense, form, isEdit, onSaved, t, validate])

  const handleDelete = useCallback(async () => {
    if (!expense) return

    setConfirmDelete(false)
    setLoading(true)
    setSubmitError(null)

    const result = await deleteExpense(expense.id)

    setLoading(false)

    if (!result.success) {
      setSubmitError(t('v2.expenses.errors.deleteFailed'))

      return
    }

    onSaved()
    onOpenChange(false)
  }, [expense, onOpenChange, onSaved, t])

  return (
    <>
      <SidePanel
        footer={
          <div className='flex items-center justify-between gap-3'>
            {/* El pie es lo único que distingue alta de edición: en el alta
                `Cancelar`, en la edición `Eliminar`. Sale de las capturas. */}
            {isEdit ? (
              <Button
                className='text-feedback-error'
                disabled={loading || success != null}
                type='button'
                variant='outlined'
                onClick={() => setConfirmDelete(true)}
              >
                {t('v2.expenses.form.delete')}
              </Button>
            ) : (
              <Button
                disabled={loading || success != null}
                type='button'
                variant='outlined'
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel')}
              </Button>
            )}

            <Button disabled={loading || success != null} type='button' onClick={handleSubmit}>
              {loading && <Loader2 aria-hidden className='size-4 animate-spin' />}
              {t('common.confirm')}
            </Button>
          </div>
        }
        open={open}
        title={t(isEdit ? 'v2.expenses.form.editTitle' : 'v2.expenses.form.createTitle')}
        onOpenChange={onOpenChange}
      >
        <div className='rounded-lg border p-4'>
          <p className='text-muted-foreground mb-4 border-b pb-3 text-sm'>
            {t(isEdit ? 'v2.expenses.form.introEdit' : 'v2.expenses.form.intro')}
          </p>

          <div className='flex flex-col gap-4'>
            <FormField
              error={errors.category}
              htmlFor='expense_category'
              label={t('v2.expenses.form.category')}
            >
              <Select
                value={form.category}
                onValueChange={(category) => setForm((prev) => ({ ...prev, category }))}
              >
                <SelectTrigger id='expense_category'>
                  <SelectValue placeholder={t('v2.expenses.form.categoryPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              error={errors.description}
              htmlFor='expense_description'
              label={t('v2.expenses.form.description')}
            >
              <Textarea
                id='expense_description'
                placeholder={t('v2.expenses.form.descriptionPlaceholder')}
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </FormField>

            {/* Monto y Fecha comparten fila en las capturas, en los dos viewports. */}
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                error={errors.amount}
                htmlFor='expense_amount'
                label={t('v2.expenses.form.amount')}
              >
                <InputCurrency
                  id='expense_amount'
                  invalid={Boolean(errors.amount)}
                  value={form.amount}
                  onValueChange={(amount) => setForm((prev) => ({ ...prev, amount }))}
                />
              </FormField>

              <FormField
                error={errors.date}
                htmlFor='expense_date'
                label={t('v2.expenses.form.date')}
              >
                <DatePicker
                  key={`${expense?.id ?? 'new'}-${open}`}
                  defaultValue={form.date}
                  id='expense_date'
                  invalid={Boolean(errors.date)}
                  name='expense_date'
                  onValueChange={(date) => setForm((prev) => ({ ...prev, date }))}
                />
              </FormField>
            </div>

            <FormField htmlFor='expense_payment_method' label={t('v2.expenses.form.method')}>
              <Select
                value={form.paymentMethod}
                onValueChange={(paymentMethod) => setForm((prev) => ({ ...prev, paymentMethod }))}
              >
                <SelectTrigger id='expense_payment_method'>
                  <SelectValue placeholder={t('v2.expenses.form.methodPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {PaymentTypeArray.map((method) => (
                    <SelectItem key={method} value={method}>
                      {t(PaymentsTranslation[method])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
        </div>

        {submitError && <p className='text-feedback-error mt-4 text-sm'>{submitError}</p>}

        {success && (
          <div className='text-feedback-success border-feedback-success/40 bg-feedback-success/10 mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm'>
            <CircleCheck aria-hidden className='size-4 shrink-0' />
            {t(`v2.expenses.success.${success}`)}
          </div>
        )}
      </SidePanel>

      <ConfirmDialog
        destructive
        description={t('v2.expenses.delete.description')}
        isPending={loading}
        open={confirmDelete}
        title={t('v2.expenses.delete.title')}
        onConfirm={handleDelete}
        onOpenChange={setConfirmDelete}
      />
    </>
  )
}

function emptyForm(): FormState {
  return {
    category: '',
    description: '',
    amount: 0,
    // Nunca `new Date().toISOString().slice(0, 10)`: en AR después de las 21:00
    // eso devuelve el día siguiente.
    date: getTodayIsoDateInAppTz(),
    paymentMethod: '',
  }
}

function formFromExpense(expense: Expense): FormState {
  return {
    // Los gastos viejos pueden tener la categoría en español ("Servicios"); sin
    // normalizar, el Select no matchearía ninguna opción y el campo se
    // mostraría vacío como si la categoría se hubiera perdido.
    category: normalizeCategoryValue(expense.category),
    description: expense.description ?? '',
    amount: expense.amount ?? 0,
    date: toAppTzIsoDate(expense.expense_date),
    paymentMethod: expense.payment_method ?? '',
  }
}
