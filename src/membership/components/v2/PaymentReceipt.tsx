'use client'

import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { formatCalendarDate } from '@/lib/format-date'
import { formatCurrency } from '@/lib/format-currency'
import { useTranslations } from '@/lib/i18n/context'
import { MembershipTranslationShort, PaymentsTranslation } from '@/membership/consts'
import type { MembershipTypes, PaymentType } from '@/membership/consts'

/** El `id` que captura `useShareImage` para convertirlo en PNG. */
export const PAYMENT_RECEIPT_ELEMENT_ID = 'v2-payment-receipt'

export interface PaymentReceiptData {
  customerName: string
  membershipType: MembershipTypes
  /** Etiqueta ya resuelta de la modalidad — "Mes completo", "Medio mes". */
  periodModeLabel: string | null
  base: number
  discount: number
  surcharge: number
  total: number
  paymentMethod: PaymentType | ''
  /** `YYYY-MM-DD` del día de emisión, en la TZ del negocio. */
  issuedOn: string
  /** `membership_payments.receipt_number`, formato `YYYY-NNNNN`. */
  receiptNumber: string | null
}

/**
 * Comprobante de pago (Fase 8) — la única pieza del rediseño pensada para salir
 * de la app.
 *
 * Se renderiza a 390px de ancho fijo, igual en desktop y en mobile, porque el
 * destino real no es la pantalla sino **una imagen que se manda por WhatsApp**:
 * un ancho responsive produciría comprobantes de tamaños distintos según desde
 * dónde se emitieron.
 *
 * **Todos los colores van literales, no con tokens.** `html-to-image` serializa
 * los estilos computados, y una CSS var que resuelva distinto —o no resuelva—
 * fuera del árbol de `[data-v2]` saldría en el PNG como negro o transparente.
 * Es el único componente de la v2 donde eso está bien.
 *
 * DIVERGENCIAS CONTRA EL FIGMA:
 *
 * 1. **Lleva número de comprobante**, que el diseño no dibuja. Es lo que
 *    `receipt_number` resuelve desde la migración 20260921101140: un
 *    comprobante sin número no se puede rastrear hasta la fila que lo respalda.
 * 2. **La marca es el círculo del sidebar + el nombre del negocio**, no el
 *    wordmark "ACTITUD" del diseño: ese logo no existe como asset en el repo.
 *    Sale del mismo `v2.sidebar.brandName` que el resto de la app, así que el
 *    segundo tenant lo hereda sin tocar este archivo. **Falta exportar el
 *    wordmark y la marca de agua del isotipo desde Figma.**
 * 3. **`Membresía` muestra el nombre del plan y `Modalidad de cobro` su precio
 *    base**, igual que el resumen del paso 2 — en el diseño las dos pantallas
 *    se contradicen (defectos #3, #4 y #6).
 * 4. **La fecha es el día de emisión**, que para un cobro recién registrado es
 *    su `created_at`. No se relee de la DB: `membership_payments` es admin-only
 *    por RLS y el comprobante tiene que funcionar para cualquier operador. La
 *    única fila donde las dos fechas pueden diferir es un re-cobro del mismo
 *    período —que conserva el número original—, y hoy no hay ninguna pantalla
 *    que reimprima comprobantes viejos. Cuando la haya, esa sí lee `created_at`.
 */
export default function PaymentReceipt({ data }: { data: PaymentReceiptData }) {
  const { t } = useTranslations()

  return (
    <div
      className='flex w-[390px] shrink-0 flex-col gap-5 bg-white px-6 py-7 text-[#171717]'
      id={PAYMENT_RECEIPT_ELEMENT_ID}
    >
      <header className='flex flex-col items-center gap-3'>
        <div className='flex items-center gap-2'>
          <span className='flex size-7 items-center justify-center rounded-full bg-[#171717]'>
            <ArrowUpRight aria-hidden className='size-4 text-white' />
          </span>
          <span className='text-lg font-bold tracking-wide'>{t('v2.sidebar.brandName')}</span>
        </div>
        <span className='text-sm font-semibold'>{t('v2.membership.receipt.title')}</span>
      </header>

      <section className='flex flex-col gap-1 rounded-lg border border-[#E5E5E5] px-4 py-3 text-sm'>
        <span className='font-semibold'>{data.customerName}</span>
        <span>
          {t('v2.membership.receipt.membershipLine', {
            plan: t(MembershipTranslationShort[data.membershipType]),
          })}
        </span>
        <span>
          {t('v2.membership.receipt.date', { date: formatCalendarDate(data.issuedOn) })}
        </span>
        {data.receiptNumber && (
          <span className='text-[#737373]'>
            {t('v2.membership.receipt.number', { number: data.receiptNumber })}
          </span>
        )}
      </section>

      <section className='overflow-hidden rounded-lg border border-[#E5E5E5]'>
        <Row label={t('v2.membership.receipt.membership')}>
          {t(MembershipTranslationShort[data.membershipType])}
        </Row>
        {data.periodModeLabel && (
          <Row label={t('v2.membership.receipt.chargeMode')}>
            {`${data.periodModeLabel} - ${formatCurrency(data.base)}`}
          </Row>
        )}
        <Row label={t('v2.membership.receipt.discount')}>
          {data.discount > 0 ? `- ${formatCurrency(data.discount)}` : '-'}
        </Row>
        <Row label={t('v2.membership.receipt.surcharge')}>
          {data.surcharge > 0 ? `+ ${formatCurrency(data.surcharge)}` : '-'}
        </Row>
        <Row label={t('v2.membership.receipt.promotion')}>
          {t('v2.membership.renew.noPromotion')}
        </Row>
        {data.paymentMethod && (
          <Row label={t('v2.membership.receipt.paymentMethod')}>
            {t(PaymentsTranslation[data.paymentMethod])}
          </Row>
        )}
        <div className='flex items-center justify-between gap-3 bg-[#F5F5F5] px-4 py-3'>
          <span className='text-base font-bold'>{t('v2.membership.receipt.total')}</span>
          <span className='text-base font-bold'>{formatCurrency(data.total)}</span>
        </div>
      </section>

      <footer className='flex flex-col items-center gap-1 text-center'>
        <span className='text-sm font-semibold'>{t('v2.membership.receipt.thanks')}</span>
        <span className='text-xs text-[#737373]'>{t('v2.membership.receipt.disclaimer')}</span>
      </footer>
    </div>
  )
}

// Sub-componentes

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='flex items-baseline justify-between gap-3 border-b border-[#E5E5E5] px-4 py-2.5 text-sm last:border-b-0'>
      <span className='text-[#737373]'>{label}</span>
      <span className='truncate text-right font-medium'>{children}</span>
    </div>
  )
}
