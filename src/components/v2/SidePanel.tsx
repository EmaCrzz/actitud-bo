'use client'

import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { useTranslations } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'

interface SidePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Bajada bajo el título. En el Figma: "Complete los datos para registrar un cliente." */
  description?: string
  /**
   * Elemento a la izquierda del título — en la práctica, el avatar del cliente.
   * Lo usa el modal de asistencia, donde el título ES la identidad del cliente
   * en vez del nombre de la acción.
   */
  avatar?: ReactNode
  /**
   * Contenido fijo entre el header y el body — no scrollea.
   * En el Figma lo usa el flow de renovación para dejar la ficha del cliente
   * anclada arriba, y los formularios multi-step para el <Stepper>.
   */
  pinned?: ReactNode
  /** Acciones al pie. Quedan fijas; el body scrollea por debajo. */
  footer?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Shell de los paneles laterales de la v2.
 *
 * El Figma tiene dos componentes con nombres distintos — `Modal / Membership Form`
 * y `Customer Detail Modal` — pero **la geometría es idéntica**: ambos son
 * `x=800, 480×832` en el frame desktop de 1280 (anclados al borde derecho, altura
 * completa) y `390×844` full-screen en mobile. Son el mismo contenedor con
 * contenido distinto, así que acá es un solo componente en vez de dos wrappers
 * que sólo se diferenciarían en el nombre.
 *
 * El `data-v2` va explícito: Radix monta el Sheet por portal, fuera del wrapper
 * `[data-v2]` del layout, y sin esto hereda la paleta del tenant v1.
 */
export default function SidePanel({
  open,
  onOpenChange,
  title,
  description,
  avatar,
  pinned,
  footer,
  children,
  className,
}: SidePanelProps) {
  const { t } = useTranslations()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(
          // Mobile: full-screen. Desktop: panel de 480px pegado a la derecha.
          //
          // El `!p-0` es obligatorio, no cosmético: globals.css aplica
          // `[data-v2='true'] { padding: 2rem 3rem }` para el padding externo del
          // viewport, y como este portal lleva `data-v2` para heredar la paleta,
          // se come esa regla. Un `p-0` común pierde por especificidad. El padding
          // real lo ponen las secciones de adentro.
          'w-full gap-0 !p-0 sm:max-w-[480px]',
          className
        )}
        data-v2='true'
        showCloseButton={false}
        side='right'
      >
        <header className='flex items-start justify-between gap-3 border-b px-6 pt-6 pb-4'>
          <div className='flex min-w-0 items-center gap-3'>
            {avatar}
            <div className='flex min-w-0 flex-col gap-1'>
              <SheetTitle className='truncate text-base font-semibold'>{title}</SheetTitle>
              {description ? (
                <SheetDescription className='text-sm'>{description}</SheetDescription>
              ) : (
                // Radix exige una descripción accesible aunque no se muestre.
                <SheetDescription className='sr-only'>{title}</SheetDescription>
              )}
            </div>
          </div>
          <button
            aria-label={t('common.close')}
            className='rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground hover:cursor-pointer'
            type='button'
            onClick={() => onOpenChange(false)}
          >
            <X className='size-5' />
          </button>
        </header>

        {pinned && <div className='border-b px-6 py-4'>{pinned}</div>}

        <div className='flex-1 overflow-y-auto px-6 py-4'>{children}</div>

        {footer && <div className='border-t px-6 pt-4 pb-6'>{footer}</div>}
      </SheetContent>
    </Sheet>
  )
}
