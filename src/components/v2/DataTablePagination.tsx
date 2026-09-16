'use client'

import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'

/** Cuántas páginas numeradas se dibujan alrededor de la actual antes de elipsar. */
const SIBLING_COUNT = 1

type PageItem = number | 'ellipsis'

/**
 * Páginas a dibujar: siempre la primera y la última, la actual con un vecino a
 * cada lado, y elipsis para tapar los huecos. Con pocas páginas devuelve todas
 * sin elipsis, que es el caso normal del listado de clientes.
 */
export function getPageItems(current: number, totalPages: number): PageItem[] {
  // 1 (primera) + 1 (última) + actual + 2 vecinos + 2 elipsis
  const maxSlots = SIBLING_COUNT * 2 + 5

  if (totalPages <= maxSlots) {
    return Array.from({ length: totalPages }, (_, index) => index)
  }

  const first = 0
  const last = totalPages - 1
  const from = Math.max(current - SIBLING_COUNT, first + 1)
  const to = Math.min(current + SIBLING_COUNT, last - 1)
  const items: PageItem[] = [first]

  if (from > first + 1) items.push('ellipsis')
  for (let page = from; page <= to; page += 1) items.push(page)
  if (to < last - 1) items.push('ellipsis')
  items.push(last)

  return items
}

interface DataTablePaginationProps {
  /** Página actual, 0-indexed. */
  page: number
  pageSize: number
  /** Total de filas que matchean los filtros, no las de la página. */
  total: number
  onPageChange: (page: number) => void
  /**
   * Texto a la izquierda — en el Figma, "230 Total de clientes". Es un slot y no
   * un string porque el copy es de cada sección ("clientes", "gastos",
   * "ventas"), y la primitiva no decide copy.
   */
  summary?: ReactNode
  className?: string
}

/**
 * Paginador numerado del pie de las tablas v2.
 *
 * El listado de clientes se construyó primero con scroll infinito, porque el
 * plan asumía que el diseño no tenía paginador. La captura del Figma del
 * 2026-09-16 mostró lo contrario: contador de resultados a la izquierda y
 * `‹ Anterior · 1 2 3 … · Siguiente ›` a la derecha. Vive en `components/v2/`
 * desde el día uno porque las tablas de Membresías, Gastos, Ventas y
 * Configuración tienen el mismo pie.
 *
 * **Mobile no está verificado contra el Figma** (faltan los frames `2222:42619`
 * y `2228:47961`). A 358px los botones numerados no entran, así que se ocultan y
 * queda Anterior/Siguiente; el contador de la izquierda se mantiene porque es la
 * única referencia de cuántos resultados hay.
 */
export default function DataTablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  summary,
  className,
}: DataTablePaginationProps) {
  const { t } = useTranslations()
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // Una sola página no necesita controles, pero el contador sigue siendo útil.
  const showControls = totalPages > 1
  const canGoBack = page > 0
  const canGoForward = page < totalPages - 1

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 pt-4 text-sm',
        className
      )}
    >
      <p className='text-muted-foreground'>{summary}</p>

      {showControls && (
        <nav aria-label={t('common.pagination')} className='flex items-center gap-1'>
          <PaginationButton
            disabled={!canGoBack}
            label={t('common.previous')}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft aria-hidden className='size-4' />
            <span className='hidden sm:inline'>{t('common.previous')}</span>
          </PaginationButton>

          <ul className='hidden items-center gap-1 sm:flex'>
            {getPageItems(page, totalPages).map((item, index) =>
              item === 'ellipsis' ? (
                <li
                  key={`ellipsis-${index}`}
                  aria-hidden
                  className='px-2 text-muted-foreground'
                >
                  …
                </li>
              ) : (
                <li key={item}>
                  <PageNumberButton
                    isCurrent={item === page}
                    page={item}
                    onClick={() => onPageChange(item)}
                  />
                </li>
              )
            )}
          </ul>

          {/* En mobile los números no entran: se reemplazan por la posición. */}
          <span className='px-2 text-muted-foreground sm:hidden'>
            {t('common.pageOf', { current: String(page + 1), total: String(totalPages) })}
          </span>

          <PaginationButton
            disabled={!canGoForward}
            label={t('common.next')}
            onClick={() => onPageChange(page + 1)}
          >
            <span className='hidden sm:inline'>{t('common.next')}</span>
            <ChevronRight aria-hidden className='size-4' />
          </PaginationButton>
        </nav>
      )}
    </div>
  )
}

// Sub-componentes

function PaginationButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      aria-label={label}
      className='flex h-8 items-center gap-1 rounded-lg px-2 font-medium transition-colors hover:bg-muted hover:cursor-pointer disabled:pointer-events-none disabled:opacity-40'
      disabled={disabled}
      type='button'
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function PageNumberButton({
  page,
  isCurrent,
  onClick,
}: {
  page: number
  isCurrent: boolean
  onClick: () => void
}) {
  return (
    <button
      aria-current={isCurrent ? 'page' : undefined}
      className={cn(
        'size-8 rounded-lg text-sm transition-colors hover:cursor-pointer',
        isCurrent ? 'border font-medium' : 'text-muted-foreground hover:bg-muted'
      )}
      type='button'
      onClick={onClick}
    >
      {page + 1}
    </button>
  )
}
