'use client'

import { useEffect, useRef, useState } from 'react'
import { BarChart3, Table2 } from 'lucide-react'
import Button from '@/components/v2/ui/Button'
import { formatCompactCurrency, formatCurrency } from '@/lib/format-currency'
import { formatMonthKey } from '@/lib/format-date'
import { useTranslations } from '@/lib/i18n/context'
import { getIntlLocale } from '@/lib/i18n/locale'
import type { Language } from '@/lib/i18n/types'
import { cn } from '@/lib/utils'
import { buildYScale, scaleHeight } from '@/balance/chart-scale'
import type { BalanceMonthPoint } from '@/balance/summary'

interface EvolutionChartProps {
  series: BalanceMonthPoint[]
  /** El mes elegido: su etiqueta va en negrita, para ubicarlo en la serie. */
  month: string
  lang: Language
}

// Geometría en px. El SVG se dibuja al ancho medido del contenedor y no con un
// viewBox escalado: con viewBox, el tope de 24px por barra y los 2px de gap se
// estirarían con la pantalla, y en desktop serían bloques.
const PLOT_HEIGHT = 180
const X_AXIS_BAND = 28
const Y_AXIS_WIDTH = 56
const BAR_MAX_WIDTH = 24
const BAR_GAP = 2
const RADIUS = 4

const SERIES = [
  { key: 'income', color: 'var(--color-chart-income)', labelKey: 'v2.balance.evolution.income' },
  { key: 'expenses', color: 'var(--color-chart-expense)', labelKey: 'v2.balance.evolution.expenses' },
] as const

/**
 * "Evolución" (Fase 13): ingresos contra egresos de los últimos seis meses.
 *
 * El diseño dibuja **una** serie sin decir de qué, con siete barras bajo
 * "Últimos 6 meses". La serie que importa en un balance son **dos**: es lo
 * único de la pantalla que ninguna otra sección puede mostrar, y lo que
 * explica por qué un mes dio el triple que el anterior (en prod, septiembre
 * 2026 tuvo un tercio de los egresos de agosto).
 *
 * Specs de la skill de dataviz: barras de <= 24px con 4px redondeados arriba y
 * base recta, 2px de gap entre las dos barras de un mes, grilla de hairlines
 * sólidos, una sola escala, leyenda (son dos series) y colores categóricos
 * validados — no el verde/rojo de estado. El hover es por mes: la banda entera
 * es el blanco y el tooltip lista las dos series y el resultado. Lo mismo con
 * foco de teclado. La vista de tabla tiene todos los valores sin depender del
 * hover.
 */
export default function EvolutionChart({ series, month, lang }: EvolutionChartProps) {
  const { t } = useTranslations()
  const locale = getIntlLocale(lang)
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)

  useEffect(() => {
    const element = containerRef.current

    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))

    observer.observe(element)

    return () => observer.disconnect()
  }, [showTable])

  const scale = buildYScale(series.flatMap((point) => [point.income, point.expenses]))
  const plotWidth = Math.max(0, width - Y_AXIS_WIDTH)
  const band = series.length > 0 ? plotWidth / series.length : 0
  // Las dos barras ocupan como mucho el 60% de la banda: el resto es aire.
  const barWidth = Math.max(4, Math.min(BAR_MAX_WIDTH, (band * 0.6 - BAR_GAP) / 2))
  const activePoint = active == null ? null : series[active]

  return (
    <section
      aria-labelledby='balance_evolution_title'
      className='flex flex-col gap-3 rounded-lg border p-4'
    >
      <div className='flex flex-wrap items-start justify-between gap-x-3 gap-y-2'>
        <div>
          <h3 className='text-sm font-semibold' id='balance_evolution_title'>
            {t('v2.balance.evolution.title')}
          </h3>
          <p className='text-muted-foreground text-xs'>{t('v2.balance.evolution.subtitle')}</p>
        </div>
        <div className='flex items-center gap-3'>
          {/* Siempre visible, también en mobile: con dos series la leyenda es
              el canal de identidad confiable, no un adorno. */}
          <Legend />
          <Button
            aria-label={t(showTable ? 'v2.balance.evolution.showChart' : 'v2.balance.evolution.showTable')}
            aria-pressed={showTable}
            id='balance_evolution_toggle'
            size='icon'
            type='button'
            variant='ghost'
            onClick={() => setShowTable((value) => !value)}
          >
            {showTable ? <BarChart3 aria-hidden className='size-4' /> : <Table2 aria-hidden className='size-4' />}
          </Button>
        </div>
      </div>

      {showTable ? (
        <EvolutionTable lang={lang} locale={locale} month={month} series={series} />
      ) : (
        // La altura incluye la banda del eje X: con una altura fija que sólo
        // contara el plot, las etiquetas de los meses quedaban afuera y el card
        // ganaba un scroll interno (anti-pattern de la skill).
        <div ref={containerRef} className='relative w-full' style={{ height: PLOT_HEIGHT + X_AXIS_BAND }}>
          {width > 0 && (
            <svg
              aria-hidden
              className='block overflow-visible'
              height={PLOT_HEIGHT + X_AXIS_BAND}
              width={width}
            >
              {scale.ticks.map((tick) => {
                const y = PLOT_HEIGHT - scaleHeight(tick, scale, PLOT_HEIGHT)

                return (
                  <g key={tick}>
                    <line stroke='var(--border)' strokeWidth={1} x1={Y_AXIS_WIDTH} x2={width} y1={y} y2={y} />
                    <text
                      className='fill-muted-foreground text-[10px] tabular-nums'
                      dominantBaseline='middle'
                      textAnchor='end'
                      x={Y_AXIS_WIDTH - 8}
                      y={y}
                    >
                      {formatCompactCurrency(tick, { lang })}
                    </text>
                  </g>
                )
              })}

              {series.map((point, index) => {
                const center = Y_AXIS_WIDTH + band * index + band / 2
                const isActive = active === index

                return (
                  <g key={point.month} opacity={active == null || isActive ? 1 : 0.45}>
                    {SERIES.map((serie, serieIndex) => {
                      const height = scaleHeight(point[serie.key], scale, PLOT_HEIGHT)
                      const x = center - barWidth - BAR_GAP / 2 + serieIndex * (barWidth + BAR_GAP)

                      return (
                        <path
                          key={serie.key}
                          d={roundedTopBar(x, PLOT_HEIGHT - height, barWidth, height)}
                          fill={serie.color}
                        />
                      )
                    })}
                    <text
                      className={cn(
                        'text-[11px]',
                        point.month === month ? 'fill-foreground font-semibold' : 'fill-muted-foreground'
                      )}
                      textAnchor='middle'
                      x={center}
                      y={PLOT_HEIGHT + 18}
                    >
                      {formatMonthKey(point.month, locale, 'short')}
                    </text>
                  </g>
                )
              })}
            </svg>
          )}

          {/* El blanco de hover/foco es la banda entera del mes, no los 24px de
              la barra: nadie apunta a una barra, apunta a un mes. */}
          <div className='absolute inset-y-0 right-0 flex' style={{ left: Y_AXIS_WIDTH }}>
            {series.map((point, index) => (
              <button
                key={point.month}
                aria-label={`${formatMonthKey(point.month, locale)}: ${t('v2.balance.evolution.income')} ${formatCurrency(point.income, { lang })}, ${t('v2.balance.evolution.expenses')} ${formatCurrency(point.expenses, { lang })}, ${t('v2.balance.evolution.result')} ${formatCurrency(point.result, { lang })}`}
                className='h-full flex-1 cursor-default rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring'
                type='button'
                onBlur={() => setActive(null)}
                onFocus={() => setActive(index)}
                onPointerEnter={() => setActive(index)}
                onPointerLeave={() => setActive(null)}
              />
            ))}
          </div>

          {activePoint && active != null && (
            <Tooltip
              lang={lang}
              left={Y_AXIS_WIDTH + band * active + band / 2}
              locale={locale}
              point={activePoint}
              width={width}
            />
          )}
        </div>
      )}
    </section>
  )
}

function Legend() {
  const { t } = useTranslations()

  return (
    <ul className='flex items-center gap-3'>
      {SERIES.map((serie) => (
        <li key={serie.key} className='text-muted-foreground flex items-center gap-1.5 text-xs'>
          {/* La leyenda imita la marca: rect para barras. El texto va en tinta
              de texto, nunca del color de la serie. */}
          <span aria-hidden className='size-2.5 rounded-[2px]' style={{ background: serie.color }} />
          {t(serie.labelKey)}
        </li>
      ))}
    </ul>
  )
}

// Ancho para que "$ 1.660.850" entre en una línea junto a su etiqueta: con
// 176px los montos se partían en dos (lo reportó Ema).
const TOOLTIP_WIDTH = 232

function Tooltip({
  point,
  left,
  width,
  lang,
  locale,
}: {
  point: BalanceMonthPoint
  left: number
  width: number
  lang: Language
  locale: string
}) {
  const { t } = useTranslations()
  // Se acota al contenedor: en el primer y el último mes se saldría del card.
  const x = Math.min(Math.max(left - TOOLTIP_WIDTH / 2, 0), Math.max(0, width - TOOLTIP_WIDTH))

  return (
    <div
      className='bg-popover-background pointer-events-none absolute top-0 z-10 rounded-lg border p-3 text-xs shadow-md'
      role='presentation'
      style={{ left: x, width: TOOLTIP_WIDTH }}
    >
      <p className='text-muted-foreground mb-2'>{formatMonthKey(point.month, locale)}</p>
      <dl className='flex flex-col gap-1.5'>
        {SERIES.map((serie) => (
          <div key={serie.key} className='flex items-center justify-between gap-3'>
            <dt className='text-muted-foreground flex items-center gap-1.5'>
              {/* Clave de línea, no caja: a esta densidad una caja es tinta de
                  dato haciendo el trabajo de una etiqueta. */}
              <span aria-hidden className='h-0.5 w-3 rounded-full' style={{ background: serie.color }} />
              {t(serie.labelKey)}
            </dt>
            <dd className='font-semibold whitespace-nowrap tabular-nums'>
              {formatCurrency(point[serie.key], { lang })}
            </dd>
          </div>
        ))}
        <div className='flex items-center justify-between gap-3 border-t pt-1.5'>
          <dt className='text-muted-foreground'>{t('v2.balance.evolution.result')}</dt>
          <dd className='font-semibold whitespace-nowrap tabular-nums'>
            {formatCurrency(point.result, { lang })}
          </dd>
        </div>
      </dl>
    </div>
  )
}

/**
 * La vista de tabla: todos los valores, sin hover.
 *
 * **Dos formas según el ancho de la card, no de la pantalla** (container
 * queries). Cuatro columnas de montos a 13px necesitan ~345px. El corte es
 * 352px (22rem) para que entre la tabla a **1280** de pantalla —con dos cards
 * por fila y el sidebar abierto la card mide 378 por dentro—, que es el ancho
 * de laptop más común; con el corte en 384 ahí caía a la lista. A 1200 mide
 * 338, a 1024 250 y en mobile ~260: ahí va la lista. Medido el 2026-10-01, sin
 * desborde de la tabla en ningún ancho entre 640 y 1920. Ahí los montos se partían en dos
 * líneas ("$" / "2.520.000") y la tabla no se leía (lo reportó Ema). Debajo de
 * ese ancho cada mes es un bloque de dos líneas: mes y resultado arriba,
 * ingresos y egresos abajo. Ningún monto se parte en ninguna de las dos.
 */
function EvolutionTable({
  series,
  month,
  lang,
  locale,
}: {
  series: BalanceMonthPoint[]
  month: string
  lang: Language
  locale: string
}) {
  const { t } = useTranslations()
  const rows = [...series].reverse()
  // "Sept 2026" y no "Septiembre 2026": el nombre largo era la columna que
  // empujaba a las otras tres.
  const monthLabel = (key: string) => `${formatMonthKey(key, locale, 'short')} ${key.slice(0, 4)}`
  const money = (amount: number) => formatCurrency(amount, { lang })

  return (
    <div className='@container'>
      <table className='hidden w-full text-[13px] @[22rem]:table'>
        <caption className='sr-only'>{t('v2.balance.evolution.tableCaption')}</caption>
        <thead>
          <tr className='text-muted-foreground text-xs'>
            <th className='py-2 pr-3 text-left font-medium' scope='col'>
              {t('v2.balance.evolution.month')}
            </th>
            <th className='px-2 py-2 text-right font-medium' scope='col'>
              {t('v2.balance.evolution.income')}
            </th>
            <th className='px-2 py-2 text-right font-medium' scope='col'>
              {t('v2.balance.evolution.expenses')}
            </th>
            <th className='py-2 pl-2 text-right font-medium' scope='col'>
              {t('v2.balance.evolution.result')}
            </th>
          </tr>
        </thead>
        <tbody className='tabular-nums'>
          {rows.map((point) => (
            <tr key={point.month} className={cn('border-t', point.month === month && 'font-semibold')}>
              <th className='py-2 pr-3 text-left font-[inherit] whitespace-nowrap' scope='row'>
                {monthLabel(point.month)}
              </th>
              <td className='px-2 py-2 text-right whitespace-nowrap'>{money(point.income)}</td>
              <td className='px-2 py-2 text-right whitespace-nowrap'>{money(point.expenses)}</td>
              <td className='py-2 pl-2 text-right whitespace-nowrap'>{money(point.result)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Forma angosta. Es una lista de definiciones, no una tabla con celdas
          apiladas por CSS: así un lector de pantalla la anuncia como lo que es. */}
      <ul aria-label={t('v2.balance.evolution.tableCaption')} className='flex flex-col @[22rem]:hidden'>
        {rows.map((point) => (
          <li
            key={point.month}
            className={cn('flex flex-col gap-1 border-t py-2.5 first:border-t-0', point.month === month && 'font-semibold')}
          >
            <div className='flex items-baseline justify-between gap-3 text-sm'>
              <span className='whitespace-nowrap'>{monthLabel(point.month)}</span>
              <span className='whitespace-nowrap tabular-nums'>{money(point.result)}</span>
            </div>
            {/* Siempre una línea por serie: con `flex-wrap`, los meses de montos
                grandes apilaban y los de $0 no, y la lista se veía despareja. */}
            <dl className='text-muted-foreground flex flex-col gap-0.5 text-xs font-normal'>
              {SERIES.map((serie) => (
                <div key={serie.key} className='flex items-center gap-1.5'>
                  <dt className='flex items-center gap-1.5'>
                    <span aria-hidden className='size-2 rounded-full' style={{ background: serie.color }} />
                    {t(serie.labelKey)}
                  </dt>
                  <dd className='text-foreground whitespace-nowrap tabular-nums'>{money(point[serie.key])}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Barra con las esquinas de arriba redondeadas y la base recta, apoyada en la
 * línea de base. El radio se achica en barras más bajas que él: sin eso, una
 * barra de 2px dibujaría un arco más alto que ella misma.
 */
function roundedTopBar(x: number, y: number, width: number, height: number): string {
  if (height <= 0) return ''
  const r = Math.min(RADIUS, width / 2, height)

  return [
    `M${x},${y + height}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + width - r}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `V${y + height}`,
    'Z',
  ].join(' ')
}
