'use client'

import type { ReactNode } from 'react'
import { useTranslations } from '@/lib/i18n/context'
import { formatCalendarDate } from '@/lib/format-date'
import { formatCurrency } from '@/lib/format-currency'
import { PaymentsTranslation, type PaymentType } from '@/membership/consts'
import type { SaleFormValues } from './SaleDetailStep'

interface Props {
  values: SaleFormValues
  /** Con cliente, su nombre. Sin cliente, `null`: se muestran los "Datos de referencia". */
  customerName: string | null
  lang: 'es' | 'en'
}

/**
 * Paso 2: el resumen antes de confirmar. Misma forma que el de la renovación
 * (`RenewSummaryStep`), así los dos pasos "Confirmar" del panel se leen igual.
 *
 * **Corrige dos defectos de las capturas 8 y 12:** ahí "Método de pago" muestra
 * la fecha y "Fecha" muestra `$10/08/2026`. Acá cada fila dice lo suyo. Y la
 * etiqueta es "Detalle de la venta", la del formulario: el resumen del diseño
 * la llama "Motivo de la venta", que obliga a adivinar que es el mismo dato.
 */
export default function SaleReviewStep({ values, customerName, lang }: Props) {
  const { t } = useTranslations()
  const amount = formatCurrency(values.amount, { lang })
  const method =
    values.paymentMethod in PaymentsTranslation
      ? t(PaymentsTranslation[values.paymentMethod as PaymentType])
      : values.paymentMethod

  return (
    <div className='flex flex-col gap-3'>
      <p className='text-muted-foreground text-sm'>{t('v2.sales.review.title')}</p>

      <dl className='overflow-hidden rounded-lg border'>
        {customerName ? (
          <Row label={t('v2.sales.review.customer')}>{customerName}</Row>
        ) : (
          <Row label={t('v2.sales.review.buyerName')}>
            {values.buyerName.trim() || t('v2.sales.noBuyer')}
          </Row>
        )}
        <Row label={t('v2.sales.review.description')}>{values.description.trim()}</Row>
        <Row label={t('v2.sales.review.amount')}>{amount}</Row>
        <Row label={t('v2.sales.review.method')}>{method}</Row>
        <Row label={t('v2.sales.review.date')}>{formatCalendarDate(values.date)}</Row>

        <div className='bg-muted flex items-center justify-between gap-3 px-4 py-3'>
          <dt className='text-base font-semibold'>{t('v2.sales.review.total')}</dt>
          <dd className='text-base font-semibold'>{amount}</dd>
        </div>
      </dl>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='flex items-baseline justify-between gap-3 border-b px-4 py-3 text-sm last:border-b-0'>
      <dt className='text-muted-foreground'>{label}</dt>
      <dd className='truncate text-right font-medium'>{children}</dd>
    </div>
  )
}
