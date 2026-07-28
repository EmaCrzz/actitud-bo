import { formatCurrency } from '@/lib/format-currency'
import { useTranslations } from '@/lib/i18n/context'
import type { TranslationKey } from '@/lib/i18n/types'
import type { MonthlyIncomePoint } from '@/accounting/types'
import CardHeader from './card-header'

const MONTH_ABBREV_KEYS: TranslationKey[] = [
  'monthsAbbrev.jan',
  'monthsAbbrev.feb',
  'monthsAbbrev.mar',
  'monthsAbbrev.apr',
  'monthsAbbrev.may',
  'monthsAbbrev.jun',
  'monthsAbbrev.jul',
  'monthsAbbrev.aug',
  'monthsAbbrev.sep',
  'monthsAbbrev.oct',
  'monthsAbbrev.nov',
  'monthsAbbrev.dec',
]

interface Props {
  data: MonthlyIncomePoint[]
}

function compactCurrency(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`

  return formatCurrency(amount)
}

export default function MonthlyComparative({ data }: Props) {
  const { t } = useTranslations()
  const maxTotal = Math.max(...data.map((p) => p.total), 1)
  // Ordenar del más antiguo al más reciente para lectura natural.
  const ordered = [...data].reverse()

  return (
    <div className='p-4 rounded bg-input-background border-[0.5px] border-[#DAD7D8]'>
      <CardHeader
        subtitle={t('accounting.income.dashboard.last6MonthsSubtitle')}
        title={t('accounting.income.dashboard.last6MonthsTitle')}
      />
      <ul className='flex flex-col gap-3'>
        {ordered.map((p) => {
          const [, monthStr] = p.month.split('-')
          const monthIndex = Number(monthStr) - 1
          const label = t(MONTH_ABBREV_KEYS[monthIndex])
          const pct = Math.round((p.total / maxTotal) * 100)

          return (
            <li key={p.month} className='flex items-center gap-3 text-xs'>
              <span className='w-8 text-muted-foreground uppercase'>{label}</span>
              <span className='flex-1 h-3 rounded-full bg-white/10 overflow-hidden'>
                <span
                  className='block h-full rounded-full bg-primary400'
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className='w-16 text-right font-semibold'>{compactCurrency(p.total)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
