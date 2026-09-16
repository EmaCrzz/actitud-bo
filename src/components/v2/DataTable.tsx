'use client'

import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface DataTableColumn<T> {
  id: string
  header: string
  cell: (row: T) => ReactNode
  align?: 'left' | 'right'
  /** Clases extra para la celda y su header (ancho, truncado, etc.). */
  className?: string
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  getRowId: (row: T) => string

  /**
   * Render de la fila en mobile. **Obligatorio y a propósito.**
   *
   * El Figma no achica la tabla en mobile: la reemplaza por una lista de filas
   * (avatar con iniciales + nombre + línea secundaria + badge de estado). No hay
   * headers de columna ni scroll horizontal. Por eso esto no es un `responsive`
   * resuelto por CSS sino dos renders distintos, y el tipo lo fuerza para que
   * nadie se olvide de diseñar el mobile.
   *
   * Para la forma estándar del Figma usar `DataTableMobileRow`.
   */
  mobileRow: (row: T) => ReactNode

  /** Menú de acciones por fila (desktop). En el Figma es un `Dropdown`. */
  rowActions?: (row: T) => ReactNode
  onRowClick?: (row: T) => void

  isLoading?: boolean
  /** Si viene, reemplaza la tabla. Para fallos de carga. */
  error?: ReactNode
  /** Si viene y no hay filas, reemplaza la tabla. Usar `EmptyState`. */
  empty?: ReactNode
  /** Cuántas filas de skeleton mostrar mientras carga. */
  loadingRows?: number
  className?: string
}

export default function DataTable<T>({
  columns,
  rows,
  getRowId,
  mobileRow,
  rowActions,
  onRowClick,
  isLoading = false,
  error,
  empty,
  loadingRows = 5,
  className,
}: DataTableProps<T>) {
  if (error) return <div className={className}>{error}</div>
  if (isLoading) {
    return <DataTableSkeleton className={className} columns={columns.length} rows={loadingRows} />
  }
  if (rows.length === 0 && empty) return <div className={className}>{empty}</div>

  return (
    <div className={className}>
      {/* Desktop: tabla real */}
      <table className='hidden w-full border-separate border-spacing-0 md:table'>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                className={cn(
                  'border-b px-3 py-2 text-xs font-medium text-muted-foreground',
                  column.align === 'right' ? 'text-right' : 'text-left',
                  column.className
                )}
                scope='col'
              >
                {column.header}
              </th>
            ))}
            {rowActions && <th className='w-12 border-b px-3 py-2' />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getRowId(row)}
              className={cn(
                'transition-colors',
                onRowClick && 'hover:bg-muted/50 hover:cursor-pointer'
              )}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column) => (
                <td
                  key={column.id}
                  className={cn(
                    'border-b px-3 py-3 text-sm',
                    column.align === 'right' ? 'text-right' : 'text-left',
                    column.className
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
              {rowActions && (
                // El click del menú no debe disparar el onRowClick de la fila.
                <td
                  className='border-b px-3 py-3 text-right'
                  onClick={(event) => event.stopPropagation()}
                >
                  {rowActions(row)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile: lista de filas, no tabla */}
      <ul className='flex flex-col md:hidden'>
        {rows.map((row) => (
          <li key={getRowId(row)} className='border-b last:border-b-0'>
            {mobileRow(row)}
          </li>
        ))}
      </ul>
    </div>
  )
}

interface DataTableMobileRowProps {
  /** Iniciales para el avatar. Usar `getInitials` de `@/lib/format-person`. */
  initials: string
  title: string
  subtitle?: string
  /** Badge de estado a la derecha (ej. Activo / Vencida). */
  badge?: ReactNode
  onClick?: () => void
}

/**
 * Fila mobile con la forma estándar del Figma:
 *
 *   (AN)  Ana Beltrán              [ Vencida ]
 *         Membresía: 5 días
 *
 * Se repite en Clientes, Ventas, Gastos y en el selector de cliente de los
 * formularios, así que vive acá en vez de recrearse en cada sección.
 */
export function DataTableMobileRow({
  initials,
  title,
  subtitle,
  badge,
  onClick,
}: DataTableMobileRowProps) {
  const content = (
    <>
      <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground'>
        {initials}
      </span>
      <span className='flex min-w-0 flex-1 flex-col text-left'>
        <span className='truncate text-sm font-medium'>{title}</span>
        {subtitle && <span className='truncate text-sm text-muted-foreground'>{subtitle}</span>}
      </span>
      {badge}
    </>
  )

  if (!onClick) {
    return <div className='flex items-center gap-3 px-1 py-3'>{content}</div>
  }

  return (
    <button
      className='flex w-full items-center gap-3 px-1 py-3 transition-colors hover:bg-muted/50 hover:cursor-pointer'
      type='button'
      onClick={onClick}
    >
      {content}
    </button>
  )
}

function DataTableSkeleton({
  columns,
  rows,
  className,
}: {
  columns: number
  rows: number
  className?: string
}) {
  return (
    <div aria-busy className={cn('flex flex-col gap-3', className)}>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className='flex items-center gap-3'>
          <Skeleton className='size-10 shrink-0 rounded-full md:hidden' />
          {Array.from({ length: columns }, (_, columnIndex) => (
            <Skeleton key={columnIndex} className='h-5 flex-1' />
          ))}
        </div>
      ))}
    </div>
  )
}
