'use client'

import { useMemo } from 'react'
import DatePicker from '@/components/v2/ui/DatePicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/v2/ui/Select'
import Textarea from '@/components/v2/ui/Textarea'
import { formatCalendarDate } from '@/lib/format-date'
import { formatCurrency } from '@/lib/format-currency'
import { useTranslations } from '@/lib/i18n/context'
import { getChargeModeOptions, type ChargeMode } from '@/membership/charge-mode'
import {
  MEMBERSHIP_TYPE_DAILY,
  MEMBERSHIP_TYPE_VIP,
  MembershipTranslationWeekly,
  PaymentTypeArray,
  PaymentsTranslation,
  type MembershipTypes,
} from '@/membership/consts'
import type { MembershipType } from '@/membership/types'
import FormField from '@/components/v2/FormField'
import { resolveMembershipPeriod, type CustomerFormMembershipValues } from './customer-form-state'

interface Props {
  values: CustomerFormMembershipValues
  errors: Record<string, string>
  /** Catálogo de planes con sus tres precios. */
  membershipTypes: MembershipType[]
  onChange: (patch: Partial<CustomerFormMembershipValues>) => void
}

/**
 * Paso 2 del alta — "Membresía inicial".
 *
 * Seis campos: Tipo de membresía, Modalidad de cobro, Fecha de inicio + Fecha de
 * vencimiento, Forma de pago y Notas internas (capturas del 2026-09-17).
 *
 * TRES DIVERGENCIAS DELIBERADAS CONTRA EL FIGMA, todas decididas con Ema:
 *
 * 1. **No existe la opción "Sin membresía"** en el select de tipo, aunque el
 *    diseño la dibuja como valor por defecto (brecha B13). No es un tipo del
 *    catálogo sino el estado transitorio de un cliente recién creado, y meterlo
 *    como valor centinela en `types_memberships` contaminaría el CRUD de planes,
 *    los precios y accounting. Toda alta crea membresía; el select arranca en
 *    "Selecciona una opción". Sacarlo del alta **no elimina el estado**: hay 8
 *    clientes en producción sin fila en `customer_membership`, y el listado los
 *    sigue mostrando como "Sin membresía".
 *
 * 2. **Modalidad de cobro y Forma de pago desaparecen con VIP.** El diseño los
 *    muestra siempre, pero `membership_payments` tiene `CHECK (amount > 0)` y el
 *    plan VIP vale 0: es **imposible** escribir un pago VIP. No hay ninguno en
 *    toda la historia de la base. Pedir una forma de pago que no se va a usar es
 *    prometer un cobro que no ocurre.
 *
 * 3. **Modalidad de cobro también desaparece con Diaria**, que tiene precio
 *    único. Es el mismo comportamiento que v1, donde el select sólo se renderiza
 *    si hay más de una opción.
 */
export default function CustomerFormMembershipStep({
  values,
  errors,
  membershipTypes,
  onChange,
}: Props) {
  const { t } = useTranslations()

  const selectedType = useMemo(
    () => membershipTypes.find((type) => type.type === values.membership_type) ?? null,
    [membershipTypes, values.membership_type]
  )

  const chargeModeOptions = useMemo(() => getChargeModeOptions(selectedType), [selectedType])
  const isVip = values.membership_type === MEMBERSHIP_TYPE_VIP
  const isDaily = values.membership_type === MEMBERSHIP_TYPE_DAILY
  const showChargeMode = chargeModeOptions.length > 0

  // El pase diario no elige fechas: empieza y vence hoy. Se muestra la fecha
  // resuelta en vez de ocultar el dato, para que el operador vea qué se va a
  // guardar. Sale del mismo helper que arma el FormData, así que lo que se lee
  // acá es exactamente lo que se manda.
  const dailyPeriod = useMemo(() => resolveMembershipPeriod(values), [values])

  return (
    <div className='flex flex-col gap-4'>
      <FormField
        error={errors.membership_type}
        htmlFor='membership_type'
        label={t('v2.customers.form.membershipType')}
      >
        <Select
          value={values.membership_type || undefined}
          onValueChange={(value) =>
            onChange({
              membership_type: value as MembershipTypes,
              // Cambiar de plan reinicia la modalidad: si venía en 'surcharge'
              // y el plan nuevo no lo ofrece, `getChargeAmount` caería al precio
              // de lista sin que el select lo refleje — cobrando un monto que la
              // pantalla no muestra.
              charge_mode: 'full',
            })
          }
        >
          <SelectTrigger id='membership_type'>
            <SelectValue placeholder={t('v2.customers.form.selectPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {membershipTypes.map((type) => (
              <SelectItem key={type.type} value={type.type}>
                {t(MembershipTranslationWeekly[type.type as MembershipTypes])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      {showChargeMode && (
        <FormField
          error={errors.charge_mode}
          htmlFor='charge_mode'
          label={t('v2.customers.form.chargeMode')}
        >
          <Select
            value={values.charge_mode}
            onValueChange={(value) => onChange({ charge_mode: value as ChargeMode })}
          >
            <SelectTrigger id='charge_mode'>
              <SelectValue placeholder={t('v2.customers.form.selectPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {chargeModeOptions.map((option) => (
                <SelectItem key={option.mode} value={option.mode}>
                  {`${t(option.labelKey)} - ${formatCurrency(option.amount)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      )}

      {isDaily ? (
        <p className='text-muted-foreground bg-muted rounded-lg px-3 py-2 text-sm'>
          {t('v2.customers.form.dailyPeriodNotice', {
            date: formatCalendarDate(dailyPeriod.start_date),
          })}
        </p>
      ) : (
        <div className='grid gap-4 sm:grid-cols-2'>
          <FormField
            error={errors.start_date}
            htmlFor='start_date'
            label={t('v2.customers.form.startDate')}
          >
            <DatePicker
              defaultValue={values.start_date}
              invalid={!!errors.start_date}
              name='start_date'
              placeholder={t('v2.customers.form.datePlaceholder')}
              onValueChange={(value) => onChange({ start_date: value })}
            />
          </FormField>

          <FormField
            error={errors.end_date}
            htmlFor='end_date'
            label={t('v2.customers.form.endDate')}
          >
            <DatePicker
              defaultValue={values.end_date}
              invalid={!!errors.end_date}
              name='end_date'
              placeholder={t('v2.customers.form.datePlaceholder')}
              onValueChange={(value) => onChange({ end_date: value })}
            />
          </FormField>
        </div>
      )}

      {!isVip && (
        <FormField
          error={errors.payment_type}
          htmlFor='payment_type'
          label={t('v2.customers.form.paymentType')}
        >
          <Select
            value={values.payment_type || undefined}
            onValueChange={(value) => onChange({ payment_type: value })}
          >
            <SelectTrigger id='payment_type'>
              <SelectValue placeholder={t('v2.customers.form.selectPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {PaymentTypeArray.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(PaymentsTranslation[type])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      )}

      <div className='flex flex-col gap-3'>
        <p className='text-muted-foreground border-b pb-2 text-sm'>
          {t('v2.customers.form.observations')}
        </p>
        <FormField htmlFor='notes' label={t('v2.customers.form.notes')}>
          <Textarea
            id='notes'
            placeholder={t('v2.customers.form.notesPlaceholder')}
            rows={4}
            value={values.notes}
            onChange={(event) => onChange({ notes: event.target.value })}
          />
        </FormField>
      </div>
    </div>
  )
}
