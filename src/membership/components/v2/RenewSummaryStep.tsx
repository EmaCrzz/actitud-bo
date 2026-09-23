'use client'

import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { formatCalendarDate } from '@/lib/format-date'
import { formatCurrency } from '@/lib/format-currency'
import { useTranslations } from '@/lib/i18n/context'
import type { TranslationKey } from '@/lib/i18n/types'
import { getPeriodModeOptions } from '@/membership/charge-mode'
import { MEMBERSHIP_TYPE_VIP, MembershipTranslationShort } from '@/membership/consts'
import type { MembershipTypes } from '@/membership/consts'
import { PaymentsTranslation, type PaymentType } from '@/membership/consts'
import { getPeriodLabel, type RenewalAmounts, type RenewalFormValues } from '@/membership/renewal'
import type { MembershipType } from '@/membership/types'

const MONTH_KEYS: TranslationKey[] = [
  'months.january',
  'months.february',
  'months.march',
  'months.april',
  'months.may',
  'months.june',
  'months.july',
  'months.august',
  'months.september',
  'months.october',
  'months.november',
  'months.december',
]

interface Props {
  values: RenewalFormValues
  selectedType: MembershipType | null
  amounts: RenewalAmounts
  /** Período efectivo — el de `resolveRenewalPeriod`, no el estado crudo. */
  period: { start_date: string; end_date: string }
  /** Ver `RenewMembershipPanel`: este cobro pisa un pago ya comprobado. */
  warnsTypeChange: boolean
}

/**
 * Paso 2 de la renovación — la tabla "Resumen" y el total.
 *
 * TRES DIVERGENCIAS CONTRA EL FIGMA, que corrigen defectos del propio diseño
 * (capturas del 2026-09-22). Las tres salen de la misma raíz: en el mockup el
 * resumen muestra `Membresía $15.000` + `Modalidad de cobro: Mes completo -
 * $20.000` + `Total $15.000`, tres números que no cierran entre sí.
 *
 * 1. **`Membresía` muestra el nombre del plan, no un monto** (defecto #6). En el
 *    diseño la misma palabra significa un monto acá y el nombre del plan en el
 *    comprobante. Acá y en el comprobante dice lo mismo: "5 días".
 *
 * 2. **`Modalidad de cobro` lleva el precio base que realmente se cobra**
 *    (defecto #3 y #4). El monto que sigue a la modalidad es el que entra en la
 *    cuenta, así que `base − descuento + recargo = Total` se puede verificar
 *    leyendo la tabla. En el mockup ese número era de otro plan, y el
 *    comprobante de la misma operación además cambiaba "Mes completo" por
 *    "Medio mes".
 *
 * 3. **`Recargo`, no `Recargo por mora`.** El campo del paso 1, esta fila y el
 *    comprobante dicen la misma palabra. Además la mora es sólo uno de los
 *    motivos posibles: con "Otro monto…" el operador puede cargar un recargo que
 *    no es mora, y la fila lo seguiría llamando así.
 *
 * `Método de pago` ya venía corregido en una de las dos pantallas del diseño —
 * la otra sigue mostrando una fecha (defecto #1).
 */
export default function RenewSummaryStep({
  values,
  selectedType,
  amounts,
  period,
  warnsTypeChange,
}: Props) {
  const { t } = useTranslations()

  const isVip = values.membership_type === MEMBERSHIP_TYPE_VIP
  const empty = t('v2.membership.renew.summary.empty')

  const periodModeLabel = getPeriodModeOptions(selectedType).find(
    (option) => option.mode === values.period_mode
  )?.labelKey

  return (
    <div className='flex flex-col gap-3'>
      <p className='text-muted-foreground text-sm'>{t('v2.membership.renew.summary.title')}</p>

      <dl className='overflow-hidden rounded-lg border'>
        <Row label={t('v2.membership.renew.summary.membership')}>
          {values.membership_type
            ? t(MembershipTranslationShort[values.membership_type as MembershipTypes])
            : empty}
        </Row>

        {periodModeLabel && (
          <Row label={t('v2.membership.renew.summary.chargeMode')}>
            {`${t(periodModeLabel)} - ${formatCurrency(amounts.base)}`}
          </Row>
        )}

        {!isVip && (
          <>
            <Row label={t('v2.membership.renew.summary.promotion')}>
              {t('v2.membership.renew.noPromotion')}
            </Row>
            <Row label={t('v2.membership.renew.summary.discount')}>
              {amounts.discount > 0 ? `- ${formatCurrency(amounts.discount)}` : empty}
            </Row>
            <Row label={t('v2.membership.renew.summary.surcharge')}>
              {amounts.surcharge > 0 ? `+ ${formatCurrency(amounts.surcharge)}` : empty}
            </Row>
            <Row label={t('v2.membership.renew.summary.paymentMethod')}>
              {values.payment_type
                ? t(PaymentsTranslation[values.payment_type as PaymentType])
                : empty}
            </Row>
          </>
        )}

        <Row label={t('v2.membership.renew.summary.period')}>
          <PeriodValue endDate={period.end_date} startDate={period.start_date} />
        </Row>

        <div className='bg-muted flex items-center justify-between gap-3 px-4 py-3'>
          <dt className='text-base font-semibold'>{t('v2.membership.renew.summary.total')}</dt>
          <dd className='text-base font-semibold'>
            {isVip ? t('payments.free') : formatCurrency(amounts.total)}
          </dd>
        </div>
      </dl>

      {/* El mismo aviso que el paso 1, repetido a propósito. Allá explica la
          consecuencia en el momento de cambiar el tipo; acá es lo último que se
          lee antes de confirmar, y el operador pudo haber hecho ese cambio
          varios campos atrás. Es información, no un bloqueo. */}
      {warnsTypeChange && (
        <div
          className='border-feedback-warning text-feedback-warning flex items-start gap-2 rounded-lg border px-3 py-2 text-xs'
          role='status'
        >
          <AlertTriangle aria-hidden className='mt-0.5 size-4 shrink-0' />
          <span>{t('v2.membership.renew.typeChangeWarning')}</span>
        </div>
      )}
    </div>
  )
}

// Sub-componentes

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='flex items-baseline justify-between gap-3 border-b px-4 py-3 text-sm last:border-b-0'>
      <dt className='text-muted-foreground'>{label}</dt>
      <dd className='truncate text-right font-medium'>{children}</dd>
    </div>
  )
}

/**
 * "Agosto" cuando el período es un mes calendario completo; el rango de fechas
 * cuando no. Ver `getPeriodLabel` — con los dos datepickers editables, 15/08 →
 * 14/09 no es ningún mes.
 */
function PeriodValue({ startDate, endDate }: { startDate: string; endDate: string }) {
  const { t } = useTranslations()
  const label = getPeriodLabel(startDate, endDate)

  if (label.kind === 'month') return <>{t(MONTH_KEYS[label.month - 1])}</>

  return <>{`${formatCalendarDate(startDate)} - ${formatCalendarDate(endDate)}`}</>
}
