import { AlignJustify, Hourglass } from 'lucide-react'
import { Card } from '@/components/ui/card'
import i18n from '@/lib/i18n/api'
import type { Language } from '@/lib/i18n/types'
import type { TenantsType } from '@/lib/tenants'
import type { DailySummary } from '@/home/types'

interface DailySummaryCardProps {
  summary: DailySummary
  lang: Language
  tenant: TenantsType
}

export default async function DailySummaryCard({ summary, lang, tenant }: DailySummaryCardProps) {
  const { t } = await i18n.fetch(lang, tenant)

  const items = [
    {
      key: 'attendancesWithExpiredMembership',
      count: summary.attendancesWithExpiredMembership,
      label: t('v2.home.dailySummary.attendancesWithExpiredMembership'),
    },
    {
      key: 'paymentsRegistered',
      count: summary.paymentsRegistered,
      label: t('v2.home.dailySummary.paymentsRegistered'),
    },
    {
      key: 'newCustomers',
      count: summary.newCustomers,
      label: t('v2.home.dailySummary.newCustomers'),
    },
    {
      key: 'groupsCreated',
      count: summary.groupsCreated,
      label: t('v2.home.dailySummary.groupsCreated'),
    },
  ].filter((item) => item.count > 0)

  const isEmpty = items.length === 0

  return (
    <Card className='gap-0 p-5 bg-white rounded-lg flex flex-col'>
      <div className='flex items-center justify-between mb-4'>
        <span className='text-sm font-medium text-muted-foreground'>
          {t('v2.home.dailySummary.title')}
        </span>
        <AlignJustify aria-hidden='true' className='size-4 text-muted-foreground' />
      </div>

      {isEmpty ? (
        <EmptyState label={t('v2.home.dailySummary.empty')} />
      ) : (
        <ul className='flex flex-col divide-y divide-border'>
          {items.map((item) => (
            <li key={item.key} className='flex items-center gap-3 py-2.5 first:pt-0 last:pb-0'>
              <span className='text-sm font-semibold tabular-nums w-5 shrink-0 text-right'>
                {item.count}
              </span>
              <span className='text-sm text-muted-foreground'>{item.label}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className='flex flex-col items-center justify-center gap-3 flex-1 py-8 rounded-lg border border-dashed'>
      <Hourglass aria-hidden='true' className='size-8 text-muted-foreground opacity-40' />
      <p className='text-sm text-muted-foreground text-center max-w-[200px]'>{label}</p>
    </div>
  )
}
