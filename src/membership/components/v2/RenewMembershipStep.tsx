'use client'

import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import FormField from '@/components/v2/FormField'
import DatePicker from '@/components/v2/ui/DatePicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/v2/ui/Select'
import type { ApplicableDiscount } from '@/group/types'
import { formatCalendarDate } from '@/lib/format-date'
import { formatCurrency } from '@/lib/format-currency'
import { useTranslations } from '@/lib/i18n/context'
import { getPeriodModeOptions, type PeriodMode } from '@/membership/charge-mode'
import {
  MEMBERSHIP_TYPE_DAILY,
  MEMBERSHIP_TYPE_VIP,
  MembershipTranslationWeekly,
  PaymentTypeArray,
  PaymentsTranslation,
  type MembershipTypes,
  type PaymentType,
} from '@/membership/consts'
import type { SuggestedCharge } from '@/membership/pricing'
import {
  AMOUNT_CHOICE_CUSTOM,
  AMOUNT_CHOICE_NONE,
  AMOUNT_CHOICE_SUGGESTED,
  resolveRenewalPeriod,
  type RenewalFormValues,
} from '@/membership/renewal'
import type { MembershipType } from '@/membership/types'
import AmountChoiceField, { type AmountChoiceOption } from './AmountChoiceField'

interface Props {
  values: RenewalFormValues
  errors: Record<string, string>
  membershipTypes: MembershipType[]
  selectedType: MembershipType | null
  suggestion: SuggestedCharge
  applicableDiscount: ApplicableDiscount | null
  /**
   * El cliente ya tiene un pago con comprobante emitido para el período
   * vigente y el operador cambió el tipo de plan.
   */
  warnsTypeChange: boolean
  /** Período que el cliente ya tiene pago, en "YYYY-MM-DD". `null` si no hay. */
  currentPeriod: { start: string; end: string } | null
  onChange: (patch: Partial<RenewalFormValues>) => void
}

/**
 * Paso 1 de la renovación — "Nueva membresía".
 *
 * Siete campos, en el orden del Figma (capturas del 2026-09-22): Tipo de
 * membresía · Modalidad de cobro · Fecha de inicio + Fecha de vencimiento ·
 * separador "Condiciones y forma de pago" · Promociones · Descuento + Recargo ·
 * Forma de pago.
 *
 * DIVERGENCIAS DELIBERADAS CONTRA EL FIGMA:
 *
 * 1. **"Sin membresía" no se ofrece** y el select arranca con el plan vigente
 *    del cliente. El diseño lo dibuja como valor por defecto al renovar a
 *    alguien con 5 días activos (defecto #5 de las capturas), que es justo lo
 *    contrario de lo que hace falta. Es la misma decisión de la Fase 7: no es un
 *    tipo del catálogo sino el estado de un cliente sin fila en
 *    `customer_membership`.
 *
 * 2. **Promociones queda deshabilitado en "Sin promoción".** El select existe en
 *    el diseño y la columna `discount_rules.applies_to` admite `'promo'` desde
 *    la migración 20260722120000, pero **no hay ninguna regla promo cargada ni
 *    CRUD que las cree** — eso es la Fase 14. Se muestra deshabilitado en vez de
 *    ocultarlo porque el propio resumen del diseño imprime "Sin promoción", así
 *    que el concepto ya es visible para el operador.
 *
 * 3. **Modalidad de cobro y Forma de pago desaparecen con VIP**, y Modalidad
 *    también con Diaria. Mismo motivo que en el alta: VIP vale 0 y
 *    `membership_payments` exige `amount > 0`, así que es imposible escribir un
 *    pago VIP; la diaria tiene precio único y no tiene modalidades.
 */
export default function RenewMembershipStep({
  values,
  errors,
  membershipTypes,
  selectedType,
  suggestion,
  applicableDiscount,
  warnsTypeChange,
  currentPeriod,
  onChange,
}: Props) {
  const { t } = useTranslations()

  const periodModeOptions = useMemo(() => getPeriodModeOptions(selectedType), [selectedType])
  const isVip = values.membership_type === MEMBERSHIP_TYPE_VIP
  const isDaily = values.membership_type === MEMBERSHIP_TYPE_DAILY
  const dailyPeriod = useMemo(() => resolveRenewalPeriod(values), [values])

  const discountOptions = useMemo<AmountChoiceOption[]>(() => {
    const options: AmountChoiceOption[] = [
      { value: AMOUNT_CHOICE_NONE, label: t('v2.membership.renew.noDiscount') },
    ]

    if (applicableDiscount) {
      options.push({
        value: AMOUNT_CHOICE_SUGGESTED,
        label: `${applicableDiscount.rule.name} - ${formatCurrency(applicableDiscount.suggested_amount)}`,
        hint: t('v2.membership.renew.discountReason', {
          group: applicableDiscount.group.name,
          members: applicableDiscount.group.active_members_count,
        }),
      })
    }

    options.push({ value: AMOUNT_CHOICE_CUSTOM, label: t('v2.membership.renew.otherAmount') })

    return options
  }, [applicableDiscount, t])

  const surchargeOptions = useMemo<AmountChoiceOption[]>(() => {
    const options: AmountChoiceOption[] = [
      { value: AMOUNT_CHOICE_NONE, label: t('v2.membership.renew.noSurcharge') },
    ]

    // La opción sugerida sólo aparece cuando la política la respalda. Ofrecer
    // "Recargo por mora - $0" cuando no corresponde sería invitar a cobrarlo.
    if (suggestion.suggestsSurcharge) {
      options.push({
        value: AMOUNT_CHOICE_SUGGESTED,
        label: `${t('v2.membership.renew.lateFee')} - ${formatCurrency(suggestion.surcharge)}`,
        hint: t('v2.membership.renew.reason.late_payment'),
      })
    }

    options.push({ value: AMOUNT_CHOICE_CUSTOM, label: t('v2.membership.renew.otherAmount') })

    return options
  }, [suggestion, t])

  return (
    <div className='flex flex-col gap-4'>
      <FormField
        error={errors.membership_type}
        htmlFor='renew_membership_type'
        label={t('v2.membership.renew.membershipType')}
      >
        <Select
          value={values.membership_type || undefined}
          onValueChange={(value) =>
            onChange({
              membership_type: value as MembershipTypes,
              // Cambiar de plan reinicia la modalidad y el recargo sugerido: si
              // el plan nuevo no ofrece media membresía, `getPeriodBaseAmount`
              // caería al precio de lista sin que el select lo refleje —
              // cobrando un monto que la pantalla no muestra.
              period_mode: 'full',
              surcharge_choice: AMOUNT_CHOICE_NONE,
            })
          }
        >
          <SelectTrigger id='renew_membership_type'>
            <SelectValue placeholder={t('v2.membership.renew.selectPlaceholder')} />
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

      {warnsTypeChange && (
        <div
          className='border-feedback-warning text-feedback-warning flex items-start gap-2 rounded-lg border px-3 py-2 text-xs'
          role='status'
        >
          <AlertTriangle aria-hidden className='mt-0.5 size-4 shrink-0' />
          <span>{t('v2.membership.renew.typeChangeWarning')}</span>
        </div>
      )}

      {periodModeOptions.length > 0 && (
        <FormField
          error={errors.period_mode}
          // La media membresía también se sugiere, así que también lleva su
          // motivo: sin él, el operador ve un precio más bajo que el de lista y
          // no sabe si es correcto. Sólo se muestra mientras la modalidad
          // elegida siga siendo la sugerida.
          hint={
            suggestion.reason === 'mid_month_entry' && values.period_mode === suggestion.periodMode
              ? t('v2.membership.renew.reason.mid_month_entry')
              : undefined
          }
          htmlFor='renew_period_mode'
          label={t('v2.membership.renew.chargeMode')}
        >
          <Select
            value={values.period_mode}
            onValueChange={(value) => onChange({ period_mode: value as PeriodMode })}
          >
            <SelectTrigger id='renew_period_mode'>
              <SelectValue placeholder={t('v2.membership.renew.selectPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {periodModeOptions.map((option) => (
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
          {t('v2.membership.renew.dailyPeriodNotice', {
            date: formatCalendarDate(dailyPeriod.start_date),
          })}
        </p>
      ) : (
        <>
          {/* El período que el cliente ya tiene pago. Sin esto el operador
              elige fechas a ciegas: no hay ninguna otra pantalla que diga
              cuándo arrancó el período vigente —el Perfil muestra días
              restantes, no la fecha— y es el dato que decide si este cobro
              entra como pago nuevo o pisa el anterior. */}
          {currentPeriod && (
            <p className='text-muted-foreground text-xs'>
              {t('v2.membership.renew.currentPeriod', {
                start: formatCalendarDate(currentPeriod.start),
                end: formatCalendarDate(currentPeriod.end),
              })}
            </p>
          )}
          <div className='grid gap-4 sm:grid-cols-2'>
            <FormField
              error={errors.start_date}
              htmlFor='renew_start_date'
              label={t('v2.membership.renew.startDate')}
            >
              <DatePicker
                defaultValue={values.start_date}
                id='renew_start_date'
                invalid={!!errors.start_date}
                name='renew_start_date'
                placeholder={t('v2.membership.renew.datePlaceholder')}
                onValueChange={(value) => onChange({ start_date: value })}
              />
            </FormField>

            <FormField
              error={errors.end_date}
              htmlFor='renew_end_date'
              label={t('v2.membership.renew.endDate')}
            >
              <DatePicker
                defaultValue={values.end_date}
                id='renew_end_date'
                invalid={!!errors.end_date}
                name='renew_end_date'
                placeholder={t('v2.membership.renew.datePlaceholder')}
                onValueChange={(value) => onChange({ end_date: value })}
              />
            </FormField>
          </div>
        </>
      )}

      {!isVip && (
        <div className='flex flex-col gap-4'>
          <p className='text-muted-foreground border-b pb-2 text-sm'>
            {t('v2.membership.renew.conditions')}
          </p>

          <FormField htmlFor='renew_promotion' label={t('v2.membership.renew.promotions')}>
            <Select disabled value='none'>
              <SelectTrigger id='renew_promotion'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='none'>{t('v2.membership.renew.noPromotion')}</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          {/* Apilados, no en dos columnas como los dibuja el Figma. Cada uno
              crece cuando se elige "Otro monto…" —aparecen el campo de moneda y
              el de motivo— y en columnas eso deja un hueco del alto de dos
              campos al lado del que no se abrió. */}
          <div className='flex flex-col gap-4'>
            <AmountChoiceField
              requireNote
              amountError={errors.discount_amount}
              customAmount={values.discount_custom_amount}
              id='renew_discount'
              label={t('v2.membership.renew.discount')}
              note={values.discount_note}
              noteError={errors.discount_note}
              options={discountOptions}
              value={values.discount_choice}
              onChange={({ choice, customAmount, note }) =>
                onChange({
                  ...(choice !== undefined && { discount_choice: choice }),
                  ...(customAmount !== undefined && { discount_custom_amount: customAmount }),
                  ...(note !== undefined && { discount_note: note }),
                })
              }
            />

            <AmountChoiceField
              amountError={errors.surcharge_amount}
              customAmount={values.surcharge_custom_amount}
              id='renew_surcharge'
              label={t('v2.membership.renew.surcharge')}
              note={values.surcharge_note}
              options={surchargeOptions}
              value={values.surcharge_choice}
              onChange={({ choice, customAmount, note }) =>
                onChange({
                  ...(choice !== undefined && { surcharge_choice: choice }),
                  ...(customAmount !== undefined && { surcharge_custom_amount: customAmount }),
                  ...(note !== undefined && { surcharge_note: note }),
                })
              }
            />
          </div>

          <FormField
            error={errors.payment_type}
            htmlFor='renew_payment_type'
            label={t('v2.membership.renew.paymentType')}
          >
            <Select
              value={values.payment_type || undefined}
              onValueChange={(value) => onChange({ payment_type: value as PaymentType })}
            >
              <SelectTrigger id='renew_payment_type'>
                <SelectValue placeholder={t('v2.membership.renew.selectPlaceholder')} />
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
        </div>
      )}
    </div>
  )
}
