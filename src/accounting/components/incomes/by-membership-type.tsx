'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/format-currency'
import { useTranslations } from '@/lib/i18n/context'
import type { IncomesByMembershipType } from '@/accounting/types'
import CardHeader from './card-header'
import ByTypeDetailModal from './by-type-detail-modal'
import { formatMembershipLabel } from './format-membership-label'

interface Props {
  data: IncomesByMembershipType[]
  month: string
  monthLabel: string
}

export default function ByMembershipType({ data, month, monthLabel }: Props) {
  const { t } = useTranslations()
  const [selectedType, setSelectedType] = useState<{ type: string; label: string } | null>(null)

  if (data.length === 0) {
    return (
      <div className='p-4 rounded bg-input-background border-[0.5px] border-[#DAD7D8]'>
        <CardHeader
          subtitle={t('accounting.income.dashboard.byTypeSubtitle')}
          title={t('accounting.income.dashboard.byTypeTitle')}
        />
        <p className='text-sm text-muted-foreground'>
          {t('accounting.income.dashboard.byTypeEmpty')}
        </p>
      </div>
    )
  }

  const grandTotal = data.reduce((sum, row) => sum + row.total, 0)

  return (
    <div className='p-4 rounded bg-input-background border-[0.5px] border-[#DAD7D8]'>
      <CardHeader
        subtitle={t('accounting.income.dashboard.byTypeSubtitle')}
        title={t('accounting.income.dashboard.byTypeTitle')}
      />

      <div className='flex flex-col gap-1'>
        {data.map((row) => {
          const pct = grandTotal > 0 ? Math.round((row.total / grandTotal) * 100) : 0
          const label = formatMembershipLabel(row.membership_type, t)

          return (
            <button
              key={row.membership_type}
              aria-label={t('accounting.income.dashboard.byTypeCta', { label })}
              className='w-full text-left rounded p-2 -mx-2 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary400'
              type='button'
              onClick={() => setSelectedType({ type: row.membership_type, label })}
            >
              <div className='flex justify-between items-baseline mb-2 gap-2'>
                <p className='text-sm capitalize flex items-center gap-1'>
                  {label}
                  <ChevronRight className='size-3 text-muted-foreground' />
                </p>
                <p className='text-sm font-semibold shrink-0'>{formatCurrency(row.total)}</p>
              </div>
              <div className='w-full h-2 rounded-full bg-white/10 overflow-hidden mb-1'>
                <div
                  className='h-full rounded-full bg-primary400'
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className='text-xs text-muted-foreground'>
                {t('accounting.income.dashboard.byTypeCount', {
                  count: row.count,
                  pct,
                })}
              </p>
            </button>
          )
        })}
      </div>

      <ByTypeDetailModal
        membershipType={selectedType?.type ?? null}
        month={month}
        monthLabel={monthLabel}
        open={selectedType !== null}
        typeLabel={selectedType?.label ?? ''}
        onOpenChange={(open) => {
          if (!open) setSelectedType(null)
        }}
      />
    </div>
  )
}
