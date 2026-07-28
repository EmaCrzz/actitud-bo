import { formatCurrency } from '@/lib/format-currency'
import { formatDate } from '@/lib/format-date'
import { useTranslations } from '@/lib/i18n/context'
import { isSameDayInAppTz } from '@/lib/timezone'
import { PaymentsTranslation, type PaymentType } from '@/membership/consts'
import type { RecentPayment } from '@/accounting/types'
import CardHeader from './card-header'
import { formatMembershipLabel } from './format-membership-label'

interface Props {
  payments: RecentPayment[]
}

function relativeDateLabel(
  isoDate: string,
  t: (k: 'accounting.income.dashboard.today' | 'accounting.income.dashboard.yesterday') => string
): string {
  const date = new Date(isoDate)
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  if (isSameDayInAppTz(date, now)) return t('accounting.income.dashboard.today')
  if (isSameDayInAppTz(date, yesterday)) return t('accounting.income.dashboard.yesterday')

  return formatDate(date)
}

export default function RecentPaymentsFeed({ payments }: Props) {
  const { t } = useTranslations()

  return (
    <div className='p-4 rounded bg-input-background border-[0.5px] border-[#DAD7D8]'>
      <CardHeader
        subtitle={t('accounting.income.dashboard.recentSubtitle')}
        title={t('accounting.income.dashboard.recentTitle')}
      />

      {payments.length === 0 ? (
        <p className='text-xs text-muted-foreground'>
          {t('accounting.income.dashboard.recentEmpty')}
        </p>
      ) : (
        <ul className='flex flex-col'>
          {payments.map((p) => {
            const typeLabel = formatMembershipLabel(p.membership_type, t)
            const methodKey = PaymentsTranslation[p.payment_method as PaymentType]
            const methodLabel = methodKey ? t(methodKey) : p.payment_method
            const hasDiscount = p.discount_amount > 0

            return (
              <li
                key={p.id}
                className='flex flex-col py-3 border-b border-white/10 first:pt-0 last:border-0 last:pb-0'
              >
                <div className='flex justify-between items-baseline'>
                  <p className='text-xs text-muted-foreground'>
                    {relativeDateLabel(p.payment_date, t)}
                  </p>
                  <p className='text-sm font-semibold'>{formatCurrency(p.amount)}</p>
                </div>
                <p className='text-sm mt-0.5'>
                  {p.first_name} {p.last_name}
                </p>
                <p className='text-xs text-muted-foreground mt-0.5 capitalize'>
                  {typeLabel} · {methodLabel}
                  {hasDiscount && p.discount_rule_name && (
                    <span className='ml-2 text-primary400'>· {p.discount_rule_name}</span>
                  )}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
