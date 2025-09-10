import type React from 'react'

import { HOME } from '@/consts/routes'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import ArrowLeftIcon from '@/components/icons/arrow-left'
import FooterNavigation from '@/components/nav'
import AssistanceCardToday, {
  AssistanceCardTodaySkeleton,
} from '@/assistance/assistance-card-today'
import { Suspense } from 'react'
import AssistancesList, { AssistancesListSkeleton } from '@/assistance/assistances-list'
import ActivesMembership, { ActivesMembershipSkeleton } from '@/membership/components/actives'
import TopMonthlyAssintant, { TopMonthlyAssintantSkeleton } from '@/assistance/top-monthly-assintant'
import ActiveTypes, { ActiveTypesSkeleton } from '@/membership/components/active-types'


export default async function DashboardStats() {
  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-2 sm:px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
        <div className='flex gap-4 items-center'>
          <Button className='size-6 rounded-full' variant='ghost'>
            <Link href={HOME}>
              <ArrowLeftIcon className='size-6' />
            </Link>
          </Button>
          <h5 className='font-medium text-sm'>Estadísticas</h5>
        </div>
      </header>

      <section className='mt-6 px-4 max-w-3xl mx-auto w-full pb-4 grid gap-y-4 overflow-auto auto-rows-max'>
        <Suspense fallback={<AssistanceCardTodaySkeleton />}>
          <AssistanceCardToday />
        </Suspense>
        <Suspense fallback={<AssistancesListSkeleton />}>
          <AssistancesList />
        </Suspense>
        <Suspense fallback={<TopMonthlyAssintantSkeleton />}>
          <TopMonthlyAssintant />
        </Suspense>
        <Suspense fallback={<ActivesMembershipSkeleton />}>
          <ActivesMembership />
        </Suspense>
        <Suspense fallback={<ActiveTypesSkeleton />}>
          <ActiveTypes />
        </Suspense>
      </section>
      <FooterNavigation />
    </>
  )
}
