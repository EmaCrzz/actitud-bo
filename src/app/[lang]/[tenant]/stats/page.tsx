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
import api from '@/lib/i18n/api'
import { Language, TranslationKey } from '@/lib/i18n/types'
import { type TenantsType } from '@/lib/tenants'
import { ChevronRight } from 'lucide-react'
import UserCheck from '@/components/icons/user-check'
import Chart from '@/components/icons/chart'
import MoneyBag from '@/components/icons/money-bag'
import { cn } from '@/lib/utils'

const NavegableRowIcon: Record<string, React.ReactElement> = {
  'customer.actives': <UserCheck className='size-6 stroke-2 inline mr-2 -mt-1' />,
  'membership.types.title': <Chart className='size-6 stroke-2 inline mr-2 -mt-1' />,
  'finance.accountingAndFinance.title': <MoneyBag className='size-6 stroke-2 inline mr-2 -mt-1' />,
}

const NavegableRow = async ({
  title,
  href,
  lang,
  tenant,
  disabled,
}: {
  title: TranslationKey
  href: string
  lang: Language
  tenant: TenantsType
  disabled?: boolean
}) => {
  const { t } = await api.fetch(lang, tenant)

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

export default async function DashboardStats({
  params,
}: {
  params: Promise<{ lang: Language; tenant: TenantsType }>
}) {
  const { lang, tenant } = await params
  const { t } = await api.fetch(lang, tenant)

  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-2 sm:px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
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
        <NavegableRow
          href='/stats/customers'
          lang={lang}
          tenant={tenant}
          title='customer.actives'
        />
        <NavegableRow href='/stats/membership' lang={lang} tenant={tenant} title='membership.types.title' />
        <NavegableRow
          disabled
          href='#'
          lang={lang}
          tenant={tenant}
          title='finance.accountingAndFinance.title'
        />
        <Suspense fallback={<TopMonthlyAssintantSkeleton lang={lang} tenant={tenant} />}>
          <TopMonthlyAssintant lang={lang} tenant={tenant} />
        </Suspense>
        {/* <Suspense fallback={<AssistanceCardTodaySkeleton lang={lang} tenant={tenant} />}>
          <AssistanceCardToday lang={lang} tenant={tenant} />
        </Suspense>
        <Suspense
          fallback={
            <AssistancesListSkeleton todayAssistancesText={t('assistance.todayAssistances')} />
          }
        >
          <AssistancesList lang={lang} tenant={tenant} />
        </Suspense>
        <Suspense fallback={<ActivesMembershipSkeleton lang={lang} tenant={tenant} />}>
          <ActivesMembership lang={lang} tenant={tenant} />
        </Suspense>
        <Suspense fallback={<ActiveTypesSkeleton lang={lang} tenant={tenant} />}>
          <ActiveTypes lang={lang} tenant={tenant} />
        </Suspense> */}
      </section>
      <FooterNavigation />
    </>
  )
}
