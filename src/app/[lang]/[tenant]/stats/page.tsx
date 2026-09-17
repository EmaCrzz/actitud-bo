import type React from 'react'

import { Suspense } from 'react'
import { HOME } from '@/consts/routes'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import ArrowLeftIcon from '@/components/icons/arrow-left'
import FooterNavigation from '@/components/nav'
// import AssistanceCardToday, {
//   AssistanceCardTodaySkeleton,
// } from '@/assistance/assistance-card-today'
// import AssistancesList, { AssistancesListSkeleton } from '@/assistance/assistances-list'
// import ActivesMembership, { ActivesMembershipSkeleton } from '@/membership/components/actives'
// import ActiveTypes, { ActiveTypesSkeleton } from '@/membership/components/active-types'
import TopMonthlyAssintant, {
  TopMonthlyAssintantSkeleton,
} from '@/assistance/top-monthly-assintant'
import { getServerT } from '@/lib/i18n/server'
import { TranslationKey } from '@/lib/i18n/types'
import { ChevronRight } from 'lucide-react'
import UserCheck from '@/components/icons/user-check'
import Chart from '@/components/icons/chart'
import MoneyBag from '@/components/icons/money-bag'
import { cn } from '@/lib/utils'
import { isAdmin } from '@/auth/api/server'

const NavegableRowIcon: Record<string, React.ReactElement> = {
  'customer.actives': <UserCheck className='size-6 inline mr-2 -mt-1' />,
  'membership.types.title': <Chart className='size-6 inline mr-2 -mt-1' />,
  'accounting.accountingAndFinance.title': <MoneyBag className='size-6 inline mr-2 -mt-1' />,
}

const NavegableRow = async ({
  title,
  href,
  disabled,
}: {
  title: TranslationKey
  href: string
  disabled?: boolean
}) => {
  const { t } = await getServerT()

  return (
    <Link className={disabled ? 'pointer-events-none' : ''} href={disabled ? '#' : href}>
      <div
        className={cn(
          'p-4 border font-headline text-xs bg-input-background rounded-lg flex items-center gap-2',
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent cursor-pointer'
        )}
      >
        {NavegableRowIcon[title]}
        {t(title)}
        <ChevronRight className='size-6 stroke-2 ml-auto' />
      </div>
    </Link>
  )
}

export default async function DashboardStats() {
  const { t } = await getServerT()
  const userIsAdmin = await isAdmin()

  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
        <div className='flex gap-4 items-center'>
          <Button className='size-6 rounded-full' variant='ghost'>
            <Link href={HOME}>
              <ArrowLeftIcon className='size-6' />
            </Link>
          </Button>
          <h5 className='font-bold text-sm font-headline'>{t('navigation.stats')}</h5>
        </div>
      </header>

      <section className='mt-6 px-4 max-w-3xl mx-auto w-full pb-4 grid gap-y-4 overflow-auto auto-rows-max'>
        <NavegableRow href='/stats/customers' title='customer.actives' />
        <NavegableRow href='/stats/membership' title='membership.types.title' />
        {userIsAdmin && (
          <NavegableRow href='/stats/accounting' title='accounting.accountingAndFinance.title' />
        )}
        <Suspense fallback={<TopMonthlyAssintantSkeleton />}>
          <TopMonthlyAssintant />
        </Suspense>
        {/* <Suspense fallback={<AssistanceCardTodaySkeleton />}>
          <AssistanceCardToday />
        </Suspense>
        <Suspense
          fallback={
            <AssistancesListSkeleton todayAssistancesText={t('assistance.todayAssistances')} />
          }
        >
          <AssistancesList />
        </Suspense>
        <Suspense fallback={<ActivesMembershipSkeleton />}>
          <ActivesMembership />
        </Suspense>
        <Suspense fallback={<ActiveTypesSkeleton />}>
          <ActiveTypes />
        </Suspense> */}
      </section>
      <FooterNavigation />
    </>
  )
}
