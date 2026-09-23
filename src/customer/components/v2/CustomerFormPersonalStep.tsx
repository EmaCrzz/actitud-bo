'use client'

import Input from '@/components/v2/ui/Input'
import DatePicker from '@/components/v2/ui/DatePicker'
import { formatPersonId } from '@/lib/format-person-id'
import { useTranslations } from '@/lib/i18n/context'
import FormField from '@/components/v2/FormField'
import type { CustomerFormPersonalValues } from './customer-form-state'

interface Props {
  values: CustomerFormPersonalValues
  errors: Record<string, string>
  onChange: (patch: Partial<CustomerFormPersonalValues>) => void
}

/**
 * Paso 1 del alta — "Datos personales".
 *
 * Cinco campos, tal cual las capturas del 2026-09-17: Nombre, Apellido, DNI +
 * Fecha de nacimiento en una fila de dos columnas, y Contacto.
 *
 * **No pide email a propósito.** `customers.email` existe y el form de v1 lo
 * declara, pero el diseño lo sacó y se confirmó que no fue un olvido. Lo que se
 * guarda queda en null.
 */
export default function CustomerFormPersonalStep({ values, errors, onChange }: Props) {
  const { t } = useTranslations()

  return (
    <div className='flex flex-col gap-4'>
      <FormField
        error={errors.first_name}
        htmlFor='first_name'
        label={t('v2.customers.form.firstName')}
      >
        <Input
          autoComplete='off'
          id='first_name'
          value={values.first_name}
          onChange={(event) => onChange({ first_name: event.target.value })}
        />
      </FormField>

      <FormField
        error={errors.last_name}
        htmlFor='last_name'
        label={t('v2.customers.form.lastName')}
      >
        <Input
          autoComplete='off'
          id='last_name'
          value={values.last_name}
          onChange={(event) => onChange({ last_name: event.target.value })}
        />
      </FormField>

      <div className='grid gap-4 sm:grid-cols-2'>
        <FormField
          error={errors.person_id}
          htmlFor='person_id'
          label={t('v2.customers.form.personId')}
        >
          <Input
            autoComplete='off'
            id='person_id'
            inputMode='numeric'
            value={values.person_id}
            // Se formatea mientras se tipea ("30.123.444", como el Figma) y se
            // limpia recién al mandarlo al RPC: la columna guarda el DNI pelado.
            onChange={(event) => onChange({ person_id: formatPersonId(event.target.value) })}
          />
        </FormField>

        <FormField
          error={errors.birth_date}
          htmlFor='birth_date'
          label={t('v2.customers.form.birthDate')}
        >
          <DatePicker
            defaultValue={values.birth_date}
            invalid={!!errors.birth_date}
            name='birth_date'
            placeholder={t('v2.customers.form.datePlaceholder')}
            onValueChange={(value) => onChange({ birth_date: value })}
          />
        </FormField>
      </div>

      <FormField error={errors.phone} htmlFor='phone' label={t('v2.customers.form.phone')}>
        <Input
          autoComplete='off'
          id='phone'
          inputMode='tel'
          value={values.phone}
          onChange={(event) => onChange({ phone: event.target.value })}
        />
      </FormField>
    </div>
  )
}
