import type React from 'react'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { STATS } from '@/consts/routes'
import { type Language } from '@/lib/i18n/types'
import { type TenantsType } from '@/lib/tenants'
import api from '@/lib/i18n/api'
import ArrowLeftIcon from '@/components/icons/arrow-left'
import MembershipChart from '@/membership/components/membership-chart'
import MembershipRevenue from '@/membership/components/membership-revenue'
import MembershipMonthSelector from '@/membership/components/membership-month-selector'
import { MonthProvider } from '@/membership/context/month-context'

import { tenantThemes } from '@/lib/themes'

export default async function MembershipStatsPage({
  params,
}: {
  params: Promise<{ lang: Language; tenant: TenantsType }>
}) {
  const { lang, tenant } = await params
  const { t } = await api.fetch(lang, tenant)
  const colors = tenantThemes[tenant]?.colors?.primary

  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-2 sm:px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
        <div className='flex gap-4 items-center'>
          <Button className='size-6 rounded-full' variant='ghost'>
            <Link href={STATS}>
              <ArrowLeftIcon className='size-6' />
            </Link>
          </Button>
          <h5 className='font-bold text-sm font-headline'>{t('membership.types.title')}</h5>
        </div>
      </header>

      <section className='px-4 max-w-3xl mx-auto w-full pb-4 grid gap-y-6 overflow-auto auto-rows-max mt-6'>
        <MonthProvider>
          <MembershipMonthSelector />
          <MembershipChart colors={colors} />
          <MembershipRevenue colors={colors}/>
        </MonthProvider>
      </section>
    </>
  )
}
