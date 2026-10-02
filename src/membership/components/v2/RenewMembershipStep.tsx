'use client'

import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import FormField from '@/components/v2/FormField'
import DatePicker from '@/components/v2/ui/DatePicker'
import Input from '@/components/v2/ui/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/v2/ui/Select'
import { computeDiscountAmount } from '@/group/discount'
import type { DiscountRule } from '@/group/types'
import { formatCalendarDate } from '@/lib/format-date'
import { formatCurrency } from '@/lib/format-currency'
import { useTranslations } from '@/lib/i18n/context'
import {
  getPeriodBaseAmount,
  getPeriodModeOptions,
  type PeriodMode,
} from '@/membership/charge-mode'
import {
  MEMBERSHIP_TYPE_DAILY,
  MEMBERSHIP_TYPE_VIP,
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
import { getMembershipLabel } from '@/membership/catalog'

interface Props {
  values: RenewalFormValues
  errors: Record<string, string>
  membershipTypes: MembershipType[]
  selectedType: MembershipType | null
  suggestion: SuggestedCharge
  /** Reglas activas de `discount_rules`, en el orden en que se crearon. */
  promotions: DiscountRule[]
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
 * 2. **Promociones y Descuento son excluyentes** (2026-10-02). El Figma los
 *    dibuja como dos campos que se podrían combinar, pero el pago guarda una
 *    sola regla y un solo monto: con los dos, el monto manual quedaría
 *    atribuido a la promo en el desglose de Balance. Elegir uno deshabilita el
 *    otro, con el motivo a la vista. Promociones lista **todas las reglas
 *    activas** y arranca en "Sin promoción" — el grupo familiar es una de ellas,
 *    no una sugerencia por cliente. Ver el ADR 20261002120000.
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
  promotions,
  warnsTypeChange,
  currentPeriod,
  onChange,
}: Props) {
  const { t } = useTranslations()

  const periodModeOptions = useMemo(() => getPeriodModeOptions(selectedType), [selectedType])
  const isVip = values.membership_type === MEMBERSHIP_TYPE_VIP
  const isDaily = values.membership_type === MEMBERSHIP_TYPE_DAILY
  const dailyPeriod = useMemo(() => resolveRenewalPeriod(values), [values])

  const discountOptions = useMemo<AmountChoiceOption[]>(
    () => [
      { value: AMOUNT_CHOICE_NONE, label: t('v2.membership.renew.noDiscount') },
      { value: AMOUNT_CHOICE_CUSTOM, label: t('v2.membership.renew.otherAmount') },
    ],
    [t]
  )

  // El monto de cada promo contra el bruto vigente: una regla `percent` da otro
  // número si el operador cambia de plan o de modalidad, y el label tiene que
  // decir lo mismo que el total.
  const base = getPeriodBaseAmount(selectedType, values.period_mode)
  const hasPromotion = values.promotion_id !== ''
  const hasManualDiscount = values.discount_choice === AMOUNT_CHOICE_CUSTOM

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
                {getMembershipLabel(type.type, t, { name: type.name, variant: 'weekly' })}
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

          <div className='flex flex-col gap-2'>
            <FormField
              error={errors.promotion}
              hint={
                hasManualDiscount ? t('v2.membership.renew.promotionLockedByDiscount') : undefined
              }
              htmlFor='renew_promotion'
              label={t('v2.membership.renew.promotions')}
            >
              <Select
                disabled={hasManualDiscount}
                // Radix no admite `''` como valor de un item: "sin promoción"
                // viaja como un centinela y se traduce de vuelta al cambiar.
                value={values.promotion_id || NO_PROMOTION}
                onValueChange={(next) =>
                  onChange({
                    promotion_id: next === NO_PROMOTION ? '' : next,
                    // La nota es de la promo que se eligió: cambiar de promo o
                    // sacarla no puede arrastrar el motivo de la anterior.
                    discount_note: '',
                  })
                }
              >
                <SelectTrigger id='renew_promotion'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROMOTION}>
                    {t('v2.membership.renew.noPromotion')}
                  </SelectItem>
                  {promotions.map((rule) => (
                    <SelectItem key={rule.id} value={rule.id}>
                      {`${rule.name} - ${formatCurrency(computeDiscountAmount(rule, base))}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {/* Opcional (Ema, 2026-10-02): sirve para dejar con quién vino la
                familia sin volver obligatorio un paso que hoy no existe. Viaja
                a `discount_note`, el mismo campo que el motivo del manual. */}
            {hasPromotion && (
              <FormField
                htmlFor='renew_promotion_note'
                label={t('v2.membership.renew.noteLabelOptional')}
              >
                <Input
                  id='renew_promotion_note'
                  placeholder={t('v2.membership.renew.promotionNotePlaceholder')}
                  value={values.discount_note}
                  onChange={(event) => onChange({ discount_note: event.target.value })}
                />
              </FormField>
            )}
          </div>

          {/* Apilados, no en dos columnas como los dibuja el Figma. Cada uno
              crece cuando se elige "Otro monto…" —aparecen el campo de moneda y
              el de motivo— y en columnas eso deja un hueco del alto de dos
              campos al lado del que no se abrió. */}
          <div className='flex flex-col gap-4'>
            <AmountChoiceField
              requireNote
              amountError={errors.discount_amount}
              customAmount={values.discount_custom_amount}
              disabled={hasPromotion}
              disabledHint={t('v2.membership.renew.discountLockedByPromotion')}
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

/** Valor del item "Sin promoción" en el select. Ver el comentario del `value`. */
const NO_PROMOTION = 'none'
