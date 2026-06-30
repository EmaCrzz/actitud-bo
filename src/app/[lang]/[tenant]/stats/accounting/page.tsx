'use client'

import type React from 'react'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { STATS, ACCOUNTING_TAB_MEMBERSHIP, ACCOUNTING_TAB_ACCOUNTING } from '@/consts/routes'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ArrowLeftIcon from '@/components/icons/arrow-left'
import { Suspense, useEffect, useState } from 'react'
import StatsSummary from '@/accounting/components/stats-summary'
import MembershipAmounts, { MembershipAmountsLoader } from '@/membership/components/amounts'
import MonthSelectorRow from '@/components/month-selector-row'
import { useMonthNavigation } from '@/lib/hooks/use-month-navigation'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from '@/lib/i18n/context'

export default function AccountingStatsPage() {
  const { year, month, isCurrentMonth, currentMonthFormatted, goToPreviousMonth, goToNextMonth } =
    useMonthNavigation()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const { t } = useTranslations()
  const disableMembershipTab = !isCurrentMonth
  const [tab, setTab] = useState(() => {
    if (disableMembershipTab) {
      return ACCOUNTING_TAB_ACCOUNTING
    }
    if (tabParam === ACCOUNTING_TAB_MEMBERSHIP) {
      return ACCOUNTING_TAB_MEMBERSHIP
    }

    return ACCOUNTING_TAB_ACCOUNTING
  })

  useEffect(() => {
    if (disableMembershipTab && tab === ACCOUNTING_TAB_MEMBERSHIP) {
      setTab(ACCOUNTING_TAB_ACCOUNTING)
    }
  }, [disableMembershipTab, tab])

  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
        <div className='flex gap-4 items-center'>
          <Button className='size-6 rounded-full' variant='ghost'>
            <Link href={STATS}>
              <ArrowLeftIcon className='size-6' />
            </Link>
          </Button>
          <h5 className='font-bold text-sm font-headline'>
            {t('accounting.accountingAndFinance.title')}
          </h5>
        </div>
      </header>

      <section className='px-4 max-w-3xl mx-auto w-full pb-4 grid gap-y-4 overflow-auto auto-rows-max'>
        <div className='text-center text-sm text-muted-foreground'>
          <Tabs className='mt-10 grow' value={tab}>
            <TabsList className='rounded-full bg-primary w-full max-w-96 h-12'>
              <TabsTrigger
                className='hover:cursor-pointer rounded-full font-secondary font-bold'
                value={ACCOUNTING_TAB_ACCOUNTING}
                onClick={() => setTab(ACCOUNTING_TAB_ACCOUNTING)}
              >
                {t('accounting.title')}
              </TabsTrigger>
              <TabsTrigger
                className='hover:cursor-pointer rounded-full font-secondary font-bold'
                disabled={disableMembershipTab}
                value={ACCOUNTING_TAB_MEMBERSHIP}
                onClick={() => setTab(ACCOUNTING_TAB_MEMBERSHIP)}
              >
                {t('membership.title')}
              </TabsTrigger>
            </TabsList>
            <MonthSelectorRow
              isCurrentMonth={isCurrentMonth}
              month={month}
              year={year}
              onNextMonth={goToNextMonth}
              onPreviousMonth={goToPreviousMonth}
            />
            <TabsContent className='flex flex-col' value={ACCOUNTING_TAB_ACCOUNTING}>
              <StatsSummary month={currentMonthFormatted} />
            </TabsContent>
            {!disableMembershipTab && (
              <TabsContent className='flex flex-col' value={ACCOUNTING_TAB_MEMBERSHIP}>
                <Suspense fallback={<MembershipAmountsLoader />}>
                  <MembershipAmounts />
                </Suspense>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </section>
    </>
  )
}
