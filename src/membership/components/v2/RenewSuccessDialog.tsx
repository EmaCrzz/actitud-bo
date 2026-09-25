'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Share2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import Button from '@/components/v2/ui/Button'
import { formatCurrency } from '@/lib/format-currency'
import { useShareImage } from '@/lib/hooks/use-share-image'
import { useTranslations } from '@/lib/i18n/context'
import { MembershipTranslationShort, PaymentsTranslation } from '@/membership/consts'
import type { PaymentType } from '@/membership/consts'
import PaymentReceipt, {
  PAYMENT_RECEIPT_ELEMENT_ID,
  type PaymentReceiptData,
} from './PaymentReceipt'

interface RenewSuccessDialogProps {
  /** `null` mientras no hubo cobro. Su presencia es lo que abre el dialog. */
  receipt: PaymentReceiptData | null
  /** Cierra el dialog **y** el panel: el flow del Figma vuelve al origen. */
  onClose: () => void
}

/**
 * Confirmación de la renovación — el `Modal Dialog` del Figma (`2118:27698`).
 *
 * Dos vistas sobre el mismo contenedor, que es el orden del flow diseñado
 * (`Modal Dialog` → `Payment Receipt`):
 *
 * 1. **Resumen** — check verde, "Membresía renovada", la línea de la operación
 *    y el número de comprobante. Acciones: `Cerrar` y `Compartir`.
 * 2. **Comprobante** — el `PaymentReceipt` a tamaño real, para que el operador
 *    vea exactamente qué se va a mandar antes de mandarlo. Desde acá se comparte.
 *
 * Mostrar el comprobante antes de compartirlo no es un paso de más: lo que sale
 * es una imagen que le llega al cliente, y es la única oportunidad de notar que
 * dice otro monto o el nombre equivocado.
 *
 * **El ícono del Figma dice PDF y esto comparte una imagen.** Meter una
 * librería de PDF al bundle no se justifica cuando el destino real es WhatsApp,
 * donde una imagen se previsualiza en el chat y un PDF hay que abrirlo. El
 * precedente ya está en producción: el top de asistencias de v1.
 *
 * No usa `ConfirmDialog` porque acá no hay nada que confirmar —la operación ya
 * ocurrió— y su layout es de pregunta: título a la izquierda, sin ilustración.
 * El diseño de éxito es centrado y con el check como protagonista.
 */
export default function RenewSuccessDialog({ receipt, onClose }: RenewSuccessDialogProps) {
  const { t } = useTranslations()
  const { generateAndShareImage, isGenerating, error } = useShareImage()
  const [showReceipt, setShowReceipt] = useState(false)

  // Radix sólo llama a `onOpenChange` cuando el cierre lo dispara el usuario,
  // no cuando el prop `open` cambia por su cuenta — y acá pasa lo segundo, con
  // el botón `Cerrar` que vacía el recibo desde el panel. Sin esto, la próxima
  // renovación abriría directo en la vista del comprobante.
  useEffect(() => {
    if (!receipt) setShowReceipt(false)
  }, [receipt])

  /**
   * Sólo se comparte comprobante cuando hubo cobro. Una renovación VIP extiende
   * el período sin escribir en `membership_payments` —el plan vale 0 y la tabla
   * exige `amount > 0`—, así que no hay nada que respalde el papel.
   */
  const hasPayment = (receipt?.total ?? 0) > 0

  const handleShare = async () => {
    if (!receipt) return
    await generateAndShareImage(
      PAYMENT_RECEIPT_ELEMENT_ID,
      `comprobante-${receipt.receiptNumber ?? receipt.issuedOn}.png`,
      {
        // Sin `width`/`height`: el comprobante mide distinto según cuántas filas
        // tenga el desglose, y forzarlos recortaría el pie.
        share: true,
        title: t('v2.membership.receipt.title'),
        text: t('v2.membership.receipt.shareText', { name: receipt.customerName }),
      }
    )
  }

  return (
    <Dialog
      open={!!receipt}
      onOpenChange={(open) => {
        if (open) return
        setShowReceipt(false)
        onClose()
      }}
    >
      {/* `!p-6` y `!gap-0` porque el `data-v2` del portal arrastra el
          `padding: 2rem 3rem` global de globals.css — mismo motivo que en
          ConfirmDialog. El ancho se ajusta al comprobante, que mide 390 fijos. */}
      <DialogContent className='!gap-0 !p-6 sm:max-w-[438px]' data-v2='true'>
        {receipt && !showReceipt && (
          <div className='flex flex-col items-center gap-4 text-center'>
            <span className='bg-feedback-success flex size-16 items-center justify-center rounded-full'>
              <Check aria-hidden className='size-8 text-white' strokeWidth={3} />
            </span>
            <div className='flex flex-col gap-1'>
              <DialogTitle className='text-lg font-semibold'>
                {t('v2.membership.renew.success.title')}
              </DialogTitle>
              <DialogDescription asChild>
                <div className='text-muted-foreground flex flex-col gap-0.5 text-sm'>
                  <span className='text-foreground'>
                    {`${receipt.customerName} - ${t(
                      MembershipTranslationShort[receipt.membershipType]
                    )} ${formatCurrency(receipt.total)}`}
                  </span>
                  {receipt.paymentMethod && (
                    <span>
                      {t('v2.membership.renew.success.method', {
                        method: t(PaymentsTranslation[receipt.paymentMethod as PaymentType]),
                      })}
                    </span>
                  )}
                  {receipt.receiptNumber && (
                    <span>
                      {t('v2.membership.renew.success.receipt', {
                        number: receipt.receiptNumber,
                      })}
                    </span>
                  )}
                </div>
              </DialogDescription>
            </div>
            <div className='mt-2 flex w-full items-center gap-3 border-t pt-4'>
              <Button
                className='flex-1'
                type='button'
                variant={hasPayment ? 'outlined' : 'contained'}
                onClick={onClose}
              >
                {t('common.close')}
              </Button>
              {hasPayment && (
                <Button className='flex-1' type='button' onClick={() => setShowReceipt(true)}>
                  <Share2 aria-hidden className='size-4' />
                  {t('v2.membership.receipt.share')}
                </Button>
              )}
            </div>
          </div>
        )}

        {receipt && showReceipt && (
          <div className='flex flex-col items-center gap-4'>
            <DialogTitle className='sr-only'>{t('v2.membership.receipt.title')}</DialogTitle>
            <DialogDescription className='sr-only'>
              {t('v2.membership.receipt.title')}
            </DialogDescription>

            {/* Contenedor con scroll propio: en mobile el comprobante entero no
                entra en la altura del viewport, y sin esto el pie queda fuera
                de alcance. El `PaymentReceipt` no se encoge — mide 390 fijos
                porque lo que sale es una imagen. */}
            <div className='max-h-[60vh] w-full overflow-auto rounded-lg border'>
              <PaymentReceipt data={receipt} />
            </div>

            {error && <p className='text-feedback-error text-xs'>{error}</p>}

            <div className='flex w-full items-center gap-3'>
              <Button
                className='flex-1'
                disabled={isGenerating}
                type='button'
                variant='outlined'
                onClick={() => setShowReceipt(false)}
              >
                {t('common.back')}
              </Button>
              <Button
                className='flex-1'
                disabled={isGenerating}
                type='button'
                onClick={handleShare}
              >
                {isGenerating ? (
                  <Loader2 aria-hidden className='size-4 animate-spin' />
                ) : (
                  <Share2 aria-hidden className='size-4' />
                )}
                {isGenerating
                  ? t('v2.membership.receipt.sharing')
                  : t('v2.membership.receipt.share')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
