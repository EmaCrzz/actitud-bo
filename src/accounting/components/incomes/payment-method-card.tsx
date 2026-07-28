import { useTranslations } from '@/lib/i18n/context'
import { PaymentsTranslation, type PaymentType } from '@/membership/consts'
import type { IncomesByPaymentMethod } from '@/accounting/types'
import CardHeader from './card-header'

interface Props {
  data: IncomesByPaymentMethod[]
}

export default function PaymentMethodCard({ data }: Props) {
  const { t } = useTranslations()
  const total = data.reduce((sum, row) => sum + row.total, 0)

  return (
    <div className='p-4 rounded bg-input-background border-[0.5px] border-[#DAD7D8]'>
      <CardHeader
        subtitle={t('accounting.income.dashboard.byMethodSubtitle')}
        title={t('accounting.income.dashboard.byMethodTitle')}
      />

      {data.length === 0 ? (
        <p className='text-xs text-muted-foreground'>
          {t('accounting.income.dashboard.byMethodEmpty')}
        </p>
      ) : (
        <ul className='flex flex-col gap-2 text-sm'>
          {data.map((row) => {
            const pct = total > 0 ? Math.round((row.total / total) * 100) : 0
            const key = PaymentsTranslation[row.payment_method as PaymentType]
            const label = key ? t(key) : row.payment_method

            return (
              <li key={row.payment_method} className='flex justify-between'>
                <span className='capitalize'>{label}</span>
                <span className='font-semibold'>{pct}%</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
