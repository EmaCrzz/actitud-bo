import type { ReactNode } from 'react'
import { formatCurrency } from '@/lib/format-currency'
import type { Language } from '@/lib/i18n/types'

export interface BreakdownItem {
  key: string
  label: string
  total: number
}

interface BreakdownCardProps {
  id: string
  title: string
  /** El total del que cada fila es parte. Las filas lo suman exactamente. */
  total: number
  items: BreakdownItem[]
  /** Color de la serie: ingresos o egresos, el mismo que en "Evolución". */
  color: string
  emptyLabel: string
  shareLabel: (pct: number) => string
  lang: Language
  footer?: ReactNode
}

/**
 * Un desglose del Balance: filas con barra proporcional a su parte del total.
 *
 * Corrige dos defectos de las capturas: las barras del diseño **no son
 * proporcionales** (2 días con $48.000 tenía la barra más larga que 5 días con
 * $300.000) y los porcentajes de método de pago **estaban invertidos**
 * ($300.000 sobre $2.300.000 decía 87%). Acá la barra y el porcentaje salen del
 * mismo número.
 *
 * El color sigue a la entidad, no al rango: todas las barras de un desglose de
 * ingresos son del color de ingresos. Una barra más oscura donde el monto es
 * mayor duplicaría lo que ya dice el largo.
 */
export default function BreakdownCard({
  id,
  title,
  total,
  items,
  color,
  emptyLabel,
  shareLabel,
  lang,
  footer,
}: BreakdownCardProps) {
  return (
    <section aria-labelledby={id} className='flex flex-col gap-3 rounded-lg border p-4'>
      <div className='flex items-baseline justify-between gap-3'>
        <h3 className='min-w-0 text-sm font-semibold' id={id}>
          {title}
        </h3>
        {items.length > 0 && (
          // El título es el que se parte, no el monto: a 360px "Ingresos por
          // concepto" empujaba el total a dos líneas ("$" / "2.520.000").
          <span className='text-muted-foreground shrink-0 text-sm whitespace-nowrap tabular-nums'>
            {formatCurrency(total, { lang })}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className='text-muted-foreground py-4 text-sm'>{emptyLabel}</p>
      ) : (
        <ul className='flex flex-col gap-3'>
          {items.map((item) => {
            const pct = total > 0 ? (item.total / total) * 100 : 0

            return (
              <li key={item.key} className='flex flex-col gap-1.5'>
                <div className='flex items-baseline justify-between gap-3 text-sm'>
                  <span className='min-w-0 truncate'>{item.label}</span>
                  <span className='shrink-0 tabular-nums'>
                    <span className='text-muted-foreground mr-2 text-xs'>{Math.round(pct)}%</span>
                    <span className='font-medium'>{formatCurrency(item.total, { lang })}</span>
                  </span>
                </div>
                <div
                  aria-label={shareLabel(Math.round(pct))}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={Math.round(pct)}
                  className='h-1.5 overflow-hidden rounded-full'
                  role='meter'
                  // La pista es un paso más claro de la misma rampa, no un gris:
                  // así la proporción se lee sobre la barra entera.
                  style={{ background: `color-mix(in oklab, ${color} 16%, transparent)` }}
                >
                  <div className='h-full rounded-full' style={{ width: `${pct}%`, background: color }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {footer}
    </section>
  )
}
