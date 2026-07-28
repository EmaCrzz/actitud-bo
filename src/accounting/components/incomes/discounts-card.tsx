import { formatCurrency } from '@/lib/format-currency'
import { useTranslations } from '@/lib/i18n/context'
import type { IncomesDiscounts } from '@/accounting/types'
import CardHeader from './card-header'

interface Props {
  data: IncomesDiscounts
}

export default function DiscountsCard({ data }: Props) {
  const { t } = useTranslations()

  return (
    <div className='p-4 rounded bg-input-background border-[0.5px] border-[#DAD7D8]'>
      <CardHeader
        subtitle={t('accounting.income.dashboard.discountsSubtitle')}
        title={t('accounting.income.dashboard.discountsTitle')}
      />

      {data.count === 0 ? (
        <p className='text-xs text-muted-foreground'>
          {t('accounting.income.dashboard.discountsEmpty')}
        </p>
      ) : (
        <>
          <p className='text-lg font-semibold mb-1'>-{formatCurrency(data.total)}</p>
          <p className='text-xs text-muted-foreground mb-2'>
            {t('accounting.income.dashboard.discountsCount', { count: data.count })}
          </p>
          <ul className='flex flex-col gap-1 text-xs'>
            {data.by_rule.map((rule, i) => (
              <li key={rule.rule_name ?? `unknown-${i}`} className='flex justify-between gap-2'>
                <span className='truncate'>
                  {rule.rule_name ?? t('accounting.income.dashboard.discountsUnknownRule')}
                </span>
                <span className='shrink-0'>x{rule.count}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
