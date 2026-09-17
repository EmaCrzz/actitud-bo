'use client'

import type { ReactNode } from 'react'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useTranslations } from '@/lib/i18n/context'
import Button from './ui/Button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  /** Copy del botón de confirmar. Default: `common.confirm`. */
  confirmLabel?: string
  cancelLabel?: string
  /** Estilo destructivo para borrados. */
  destructive?: boolean
  /** Deshabilita ambos botones mientras la acción está en curso. */
  isPending?: boolean
  onConfirm: () => void
}

/**
 * Confirmación centrada. En el Figma es el `Modal Dialog`: `x=384`, 512 de ancho
 * en un frame de 1280 — es decir centrado — y alto variable según el contenido
 * (229 en eliminar gasto, 291 en renovar membresía, 296 en exportar).
 *
 * Aparece en 4 flows: confirmar pago, renovar membresía, exportar archivo y
 * eliminar gasto.
 *
 * Los botones usan `AlertDialogPrimitive.Cancel` / `.Action` directamente en vez
 * de los wrappers `AlertDialogCancel` / `AlertDialogAction` de shadcn: esos dos
 * **hardcodean `buttonVariants()` del botón de v1**, así que arrastran su
 * geometría y sus tokens. Con `asChild` sobre el primitive de Radix se conserva
 * el comportamiento (foco inicial en Cancel, cierre automático) y el estilo lo
 * pone el Button de v2.
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  isPending = false,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useTranslations()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {/* `!px-6 !py-6` y `!gap-6` porque el `data-v2` del portal arrastra el
          `padding: 2rem 3rem` global de globals.css, que se sumaría al
          `px-5 py-8 gap-14` propio del AlertDialogContent. */}
      <AlertDialogContent className='!gap-6 !px-6 !py-6 sm:max-w-[512px]' data-v2='true'>
        <AlertDialogHeader className='text-left'>
          <AlertDialogTitle className='text-base font-semibold'>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription asChild>
              <div className='text-sm text-muted-foreground'>{description}</div>
            </AlertDialogDescription>
          ) : (
            <AlertDialogDescription className='sr-only'>{title}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className='flex-row justify-end gap-3'>
          <AlertDialogPrimitive.Cancel asChild>
            <Button disabled={isPending} variant='outlined'>
              {cancelLabel ?? t('common.cancel')}
            </Button>
          </AlertDialogPrimitive.Cancel>
          <AlertDialogPrimitive.Action asChild>
            <Button
              disabled={isPending}
              variant={destructive ? 'destructive' : 'contained'}
              onClick={onConfirm}
            >
              {confirmLabel ?? t('common.confirm')}
            </Button>
          </AlertDialogPrimitive.Action>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
