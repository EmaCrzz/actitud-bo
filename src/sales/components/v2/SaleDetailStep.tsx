'use client'

import DatePicker from '@/components/v2/ui/DatePicker'
import FormField from '@/components/v2/FormField'
import Input from '@/components/v2/ui/Input'
import InputCurrency from '@/components/v2/ui/InputCurrency'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/v2/ui/Select'
import { useTranslations } from '@/lib/i18n/context'
import { PaymentTypeArray, PaymentsTranslation } from '@/membership/consts'

export interface SaleFormValues {
  buyerName: string
  description: string
  amount: number
  /** "YYYY-MM-DD" del datepicker. Lo canonicaliza el server. */
  date: string
  paymentMethod: string
}

export type SaleFormErrors = Partial<Record<keyof SaleFormValues, string>>

interface Props {
  values: SaleFormValues
  errors: SaleFormErrors
  /** Sin cliente se pide "Datos de referencia"; con cliente el nombre sale de su ficha. */
  withBuyerName: boolean
  onChange: (patch: Partial<SaleFormValues>) => void
}

/**
 * Paso 1: los datos de la venta. Campos y orden de las capturas 5 y 7.
 */
export default function SaleDetailStep({ values, errors, withBuyerName, onChange }: Props) {
  const { t } = useTranslations()

  return (
    <div className='rounded-lg border p-4'>
      <p className='text-muted-foreground mb-4 border-b pb-3 text-sm'>
        {t('v2.sales.form.section')}
      </p>

      <div className='flex flex-col gap-4'>
        {withBuyerName && (
          <FormField
            hint={t('v2.sales.form.buyerNameHint')}
            htmlFor='sale_buyer_name'
            label={t('v2.sales.form.buyerName')}
          >
            <Input
              id='sale_buyer_name'
              placeholder={t('v2.sales.form.buyerNamePlaceholder')}
              value={values.buyerName}
              onChange={(event) => onChange({ buyerName: event.target.value })}
            />
          </FormField>
        )}

        <FormField
          error={errors.description}
          htmlFor='sale_description'
          label={t('v2.sales.form.description')}
        >
          <Input
            aria-invalid={Boolean(errors.description)}
            id='sale_description'
            placeholder={t('v2.sales.form.descriptionPlaceholder')}
            value={values.description}
            onChange={(event) => onChange({ description: event.target.value })}
          />
        </FormField>

        <FormField error={errors.amount} htmlFor='sale_amount' label={t('v2.sales.form.amount')}>
          <InputCurrency
            id='sale_amount'
            invalid={Boolean(errors.amount)}
            value={values.amount}
            onValueChange={(amount) => onChange({ amount })}
          />
        </FormField>

        {/* Fecha y Forma de pago comparten fila en las capturas, en los dos viewports. */}
        <div className='grid grid-cols-2 gap-4'>
          <FormField error={errors.date} htmlFor='sale_date' label={t('v2.sales.form.date')}>
            <DatePicker
              defaultValue={values.date}
              id='sale_date'
              invalid={Boolean(errors.date)}
              name='sale_date'
              onValueChange={(date) => onChange({ date })}
            />
          </FormField>

          <FormField
            error={errors.paymentMethod}
            htmlFor='sale_payment_method'
            label={t('v2.sales.form.method')}
          >
            <Select
              value={values.paymentMethod}
              onValueChange={(paymentMethod) => onChange({ paymentMethod })}
            >
              <SelectTrigger aria-invalid={Boolean(errors.paymentMethod)} id='sale_payment_method'>
                <SelectValue placeholder={t('v2.sales.form.methodPlaceholder')} />
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
    </div>
  )
}
