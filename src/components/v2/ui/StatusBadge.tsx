import { cn } from '@/lib/utils'

export type StatusTone = 'success' | 'danger' | 'warning' | 'neutral'

// Paleta en escala de grises + los dos feedback colors que ya existen desde la
// fase 1. La paleta de marca (rosa) se aplica en una pasada aparte sobre las CSS
// vars de [data-v2] — ver decisión #2 del plan v2.
const TONE_CLASSES: Record<StatusTone, string> = {
  success: 'bg-feedback-success/15 text-feedback-success',
  danger: 'bg-feedback-error/15 text-feedback-error',
  warning: 'bg-feedback-warning/15 text-feedback-warning',
  neutral: 'bg-muted text-muted-foreground',
}

interface StatusBadgeProps {
  children: React.ReactNode
  tone?: StatusTone
  className?: string
}

/**
 * Badge de estado de las filas. En el Figma aparece en todas las listas y tablas
 * — "Activo" en verde, "Vencida" en rojo — tanto en desktop como en la fila
 * mobile, siempre alineado a la derecha.
 */
export default function StatusBadge({ children, tone = 'neutral', className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium',
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
