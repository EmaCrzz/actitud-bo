'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import EmptyState from '@/components/v2/EmptyState'
import { formatCurrency } from '@/lib/format-currency'
import { useTranslations } from '@/lib/i18n/context'
import type { Language } from '@/lib/i18n/types'
import { getMembershipLabel } from '@/membership/catalog'
import { PaymentsTranslation, type PaymentType } from '@/membership/consts'
import { getCategoryTranslationKey, normalizeCategoryValue } from '@/expenses/utils'
import { SALE_KIND_PRODUCT } from '@/sales/types'
import { BALANCE_MONTH_PARAM } from '@/balance/month-param'
import type { BalanceSummary } from '@/balance/summary'
import BreakdownCard, { type BreakdownItem } from './BreakdownCard'
import EvolutionChart from './EvolutionChart'
import MonthNavigation from './MonthNavigation'
import ResultCard from './ResultCard'

const INCOME_COLOR = 'var(--color-chart-income)'
const EXPENSE_COLOR = 'var(--color-chart-expense)'

interface BalanceSectionProps {
  summary: BalanceSummary | null
  currentMonth: string
  earliestMonth: string | null
  month: string
  basePath: string
  lang: Language
}

/**
 * Balance (Fase 13): ingresos contra egresos de un mes.
 *
 * Lo que esta pantalla muestra y ninguna otra puede: el resultado, su
 * evolución y la composición de **los dos lados**. Los listados de cada lado ya
 * existen —Ventas y Gastos—, así que acá no hay listados: son desgloses que
 * suman exactamente su total, calculados de las mismas filas que esas dos
 * secciones (ver `buildBalanceSummary`).
 */
export default function BalanceSection({
  summary,
  currentMonth,
  earliestMonth,
  month,
  basePath,
  lang,
}: BalanceSectionProps) {
  const { t } = useTranslations()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  // El mes al que se está yendo. La etiqueta lo muestra **en el momento** del
  // click: sin esto, ir de octubre a septiembre dejaba la pantalla quieta hasta
  // que llegaban los datos, sin ninguna señal de que algo pasaba (lo reportó
  // Ema).
  const [pendingMonth, setPendingMonth] = useState<string | null>(null)

  // Llegó el mes nuevo del server: ya no hay nada pendiente.
  useEffect(() => setPendingMonth(null), [month])

  const navigate = useCallback(
    (target: string) => {
      setPendingMonth(target)
      startTransition(() =>
        // El mes en curso va a la ruta sin `?month=`: una sola URL por vista.
        router.push(target === currentMonth ? basePath : `${basePath}?${BALANCE_MONTH_PARAM}=${target}`, {
          scroll: false,
        })
      )
    },
    [basePath, currentMonth, router]
  )

  const displayedMonth = (isPending && pendingMonth) || month

  const conceptItems: BreakdownItem[] = useMemo(
    () =>
      (summary?.incomeByConcept ?? []).map((row) => ({
        key: row.key,
        label:
          row.kind === SALE_KIND_PRODUCT
            ? t('v2.balance.concept.products')
            : getMembershipLabel(row.key, t, { name: row.planName }),
        total: row.total,
      })),
    [summary, t]
  )

  const categoryItems: BreakdownItem[] = useMemo(
    () =>
      (summary?.expensesByCategory ?? []).map((row) => ({
        key: row.key,
        label: t(getCategoryTranslationKey(normalizeCategoryValue(row.key))),
        total: row.total,
      })),
    [summary, t]
  )

  const methodItems: BreakdownItem[] = useMemo(
    () =>
      (summary?.incomeByMethod ?? []).map((row) => ({
        key: row.key,
        // Un valor fuera del vocabulario se muestra crudo: `t(undefined)`
        // revienta el render entero (Fase 10).
        label:
          row.key in PaymentsTranslation ? t(PaymentsTranslation[row.key as PaymentType]) : row.key,
        total: row.total,
      })),
    [summary, t]
  )

  const shareLabel = (pct: number) => t('v2.balance.share', { pct })

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <h2 className='text-xl font-semibold'>{t('v2.balance.title')}</h2>
          <p className='text-muted-foreground text-sm'>{t('v2.balance.subtitle')}</p>
        </div>
        <MonthNavigation
          className='w-full sm:w-auto'
          currentMonth={currentMonth}
          earliestMonth={earliestMonth}
          isPending={isPending}
          lang={lang}
          month={displayedMonth}
          onNavigate={navigate}
        />
      </div>

      {isPending ? (
        <BalanceSkeleton />
      ) : !summary ? (
        <EmptyState
          description={t('v2.balance.error.description')}
          title={t('v2.balance.error.title')}
        />
      ) : (
        <div className='grid gap-4 lg:grid-cols-2'>
          <ResultCard
            lang={lang}
            month={month}
            resultDelta={summary.resultDelta}
            totals={summary.current}
          />
          <EvolutionChart lang={lang} month={month} series={summary.series} />

          <BreakdownCard
            color={INCOME_COLOR}
            emptyLabel={t('v2.balance.empty')}
            id='balance_concept_title'
            items={conceptItems}
            lang={lang}
            shareLabel={shareLabel}
            title={t('v2.balance.concept.title')}
            total={summary.current.income}
          />
          <BreakdownCard
            color={EXPENSE_COLOR}
            emptyLabel={t('v2.balance.empty')}
            id='balance_category_title'
            items={categoryItems}
            lang={lang}
            shareLabel={shareLabel}
            title={t('v2.balance.category.title')}
            total={summary.current.expenses}
          />
          <BreakdownCard
            color={INCOME_COLOR}
            emptyLabel={t('v2.balance.empty')}
            id='balance_method_title'
            items={methodItems}
            lang={lang}
            shareLabel={shareLabel}
            title={t('v2.balance.method.title')}
            total={summary.current.income}
          />
          <AdjustmentsCard lang={lang} summary={summary} />
        </div>
      )}
    </div>
  )
}

/**
 * Lo que se ve mientras llega otro mes: **la misma grilla, con las mismas
 * cards**, para que nada salte cuando aparecen los datos.
 *
 * La skill de dataviz prefiere atenuar el render anterior en vez de un
 * skeleton. Acá no sirve: el render anterior es **de otro mes**, y durante la
 * carga se leerían los números de octubre bajo la etiqueta "Septiembre". Un
 * skeleton con la forma exacta de la grilla da el feedback sin mostrar datos
 * equivocados.
 */
function BalanceSkeleton() {
  return (
    <div aria-busy className='grid gap-4 lg:grid-cols-2'>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <div key={index} className='flex flex-col gap-3 rounded-lg border p-4'>
          <Skeleton className='h-4 w-32' />
          <Skeleton className='h-9 w-44' />
          <Skeleton className={index === 1 ? 'h-48 w-full' : 'h-24 w-full'} />
        </div>
      ))}
    </div>
  )
}

/**
 * Descuentos y recargos del mes. Hoy sólo los mostraba `/incomes` de v1, y
 * responden una pregunta que sólo tiene sentido acá: cuánto se apartaron las
 * cuotas del precio de lista. **Ya están dentro de los ingresos** —`amount` es
 * el neto—, y la card lo dice para que nadie los reste dos veces.
 */
function AdjustmentsCard({ summary, lang }: { summary: BalanceSummary; lang: Language }) {
  const { t } = useTranslations()
  const { discounts, discountedCount, surcharges, surchargedCount } = summary.adjustments
  const count = (n: number) =>
    n === 1 ? t('v2.balance.adjustments.countOne') : t('v2.balance.adjustments.count', { count: n })

  return (
    <section
      aria-labelledby='balance_adjustments_title'
      className='flex flex-col gap-3 rounded-lg border p-4'
    >
      <h3 className='text-sm font-semibold' id='balance_adjustments_title'>
        {t('v2.balance.adjustments.title')}
      </h3>
      {/* Mobile: una fila por concepto —etiqueta y cantidad a la izquierda,
          monto a la derecha— porque en dos columnas las etiquetas se partían en
          dos líneas (lo reportó Ema). Desde `sm`, dos columnas. */}
      <dl className='grid gap-3 sm:grid-cols-2 sm:gap-4'>
        <Adjustment
          count={count(discountedCount)}
          id='balance_discounts'
          label={t('v2.balance.adjustments.discounts')}
          value={formatCurrency(discounts, { lang })}
        />
        <Adjustment
          count={count(surchargedCount)}
          id='balance_surcharges'
          label={t('v2.balance.adjustments.surcharges')}
          value={formatCurrency(surcharges, { lang })}
        />
      </dl>
      <p className='text-muted-foreground border-t pt-3 text-xs'>{t('v2.balance.adjustments.hint')}</p>
    </section>
  )
}

/**
 * Un ajuste: etiqueta, monto y cantidad, en ese orden en el DOM.
 *
 * Mobile: grilla de dos columnas con el monto a la derecha ocupando las dos
 * filas y la cantidad bajo la etiqueta. Desde `sm`, bloque apilado. Se resuelve
 * con ubicación de grilla y no duplicando nodos ni anidando el `<dt>` en otro
 * `<div>`, que dentro de un `<dl>` no es HTML válido.
 */
function Adjustment({ id, label, value, count }: { id: string; label: string; value: string; count: string }) {
  return (
    <div className='grid grid-cols-[1fr_auto] items-center gap-x-3 sm:block'>
      <dt className='text-muted-foreground col-start-1 text-sm'>{label}</dt>
      <dd
        className='col-start-2 row-span-2 row-start-1 text-lg font-semibold whitespace-nowrap sm:mt-1'
        id={id}
      >
        {value}
      </dd>
      <dd className='text-muted-foreground col-start-1 text-xs'>{count}</dd>
    </div>
  )
}
