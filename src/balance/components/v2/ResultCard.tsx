'use client'

import { TrendingDown, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/format-currency'
import { formatMonthKey } from '@/lib/format-date'
import { getIntlLocale } from '@/lib/i18n/locale'
import { useTranslations } from '@/lib/i18n/context'
import type { Language } from '@/lib/i18n/types'
import { shiftMonthKey } from '@/lib/month-key'
import { cn } from '@/lib/utils'
import type { BalanceTotals } from '@/balance/summary'

interface ResultCardProps {
  month: string
  totals: BalanceTotals
  resultDelta: number | null
  lang: Language
}

/**
 * "Resultado del mes": ingresos − egresos, contra el mes anterior.
 *
 * El diseño lo titula "Balance mensual" en desktop y repite el dato en tres
 * cards en mobile ("Ventas del mes" / "Gastos registrados" / "Balance
 * mensual"), con nombres distintos para lo mismo según el ancho. Acá es una sola
 * card con los mismos nombres en los dos: Ingresos y Egresos, que además son
 * los de "Evolución" y llevan su mismo color.
 *
 * La diferencia contra el mes anterior **sí** usa verde y rojo, porque ahí el
 * color significa bien/mal — siempre con ícono y signo, nunca sólo color.
 */
export default function ResultCard({ month, totals, resultDelta, lang }: ResultCardProps) {
  const { t } = useTranslations()
  const locale = getIntlLocale(lang)
  const previousName = formatMonthKey(shiftMonthKey(month, -1), locale).split(' ')[0]

  return (
    <section aria-labelledby='balance_result_title' className='flex flex-col gap-4 rounded-lg border p-4'>
      <div>
        <h3 className='text-muted-foreground text-sm font-medium' id='balance_result_title'>
          {t('v2.balance.result.title')}
        </h3>
        <p className='mt-1 text-3xl font-semibold tracking-tight md:text-4xl' id='balance_result_value'>
          {formatCurrency(totals.result, { lang })}
        </p>
        {resultDelta == null ? (
          <p className='text-muted-foreground mt-1 text-xs'>{t('v2.balance.result.noPrevious')}</p>
        ) : (
          <p
            className={cn(
              'mt-1 flex items-center gap-1 text-sm font-medium',
              resultDelta >= 0 ? 'text-feedback-success' : 'text-feedback-error'
            )}
            id='balance_result_delta'
          >
            {resultDelta >= 0 ? (
              <TrendingUp aria-hidden className='size-4' />
            ) : (
              <TrendingDown aria-hidden className='size-4' />
            )}
            {t('v2.balance.result.vsPrevious', {
              amount: `${resultDelta >= 0 ? '+' : '−'} ${formatCurrency(Math.abs(resultDelta), { lang })}`,
              month: previousName,
            })}
          </p>
        )}
      </div>

      <dl className='grid grid-cols-2 gap-4 border-t pt-4'>
        <Figure
          color='var(--color-chart-income)'
          id='balance_income'
          label={t('v2.balance.result.income')}
          value={formatCurrency(totals.income, { lang })}
        />
        <Figure
          color='var(--color-chart-expense)'
          id='balance_expenses'
          label={t('v2.balance.result.expenses')}
          value={formatCurrency(totals.expenses, { lang })}
        />
      </dl>
    </section>
  )
}

function Figure({ id, label, value, color }: { id: string; label: string; value: string; color: string }) {
  return (
    <div className='min-w-0'>
      <dt className='text-muted-foreground flex items-center gap-1.5 text-sm'>
        {/* El color va en la marca de al lado, no en el texto. */}
        <span aria-hidden className='size-2 rounded-full' style={{ background: color }} />
        {label}
      </dt>
      <dd className='mt-1 truncate text-lg font-semibold md:text-xl' id={id}>
        {value}
      </dd>
    </div>
  )
}
