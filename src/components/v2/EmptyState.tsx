import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  /** Ícono ya renderizado. El consumer decide cuál — acá no se elige por él. */
  icon?: ReactNode
  title: string
  description?: string
  /** Acción primaria opcional (ej. "Crear el primero"). */
  action?: ReactNode
  className?: string
}

// Estado vacío compartido. La forma sale de los dos únicos empty states que el
// Figma sí diseñó — `Gastos/Vacio` (2286:119862) y Ventas en $0 (2265:70904):
// ícono en círculo, título, descripción y acción opcional, todo centrado.
export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3 px-6 py-12 text-center', className)}
    >
      {icon && (
        <div className='flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground'>
          {icon}
        </div>
      )}
      <p className='text-sm font-medium'>{title}</p>
      {description && <p className='max-w-sm text-sm text-muted-foreground'>{description}</p>}
      {action}
    </div>
  )
}
