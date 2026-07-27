'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import PlusRoundedIcon from '@/components/icons/plus-rounded'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CUSTOMER_GROUPS_NEW,
  CUSTOMER_NEW,
  CUSTOMER_TAB_GROUPS,
  CUSTOMER_TAB_INDIVIDUALS,
} from '@/consts/routes'
import ListCustomers from '@/customer/list'
import ListGroups from '@/group/components/list'
import { CustomerWithMembership } from '@/customer/types'
import { useTranslations } from '@/lib/i18n/context'

interface Props {
  initialCustomers: CustomerWithMembership[]
}

type TabValue = typeof CUSTOMER_TAB_INDIVIDUALS | typeof CUSTOMER_TAB_GROUPS

export default function ListWithTabs({ initialCustomers }: Props) {
  const { t } = useTranslations()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeTab: TabValue =
    searchParams.get('tab') === CUSTOMER_TAB_GROUPS
      ? CUSTOMER_TAB_GROUPS
      : CUSTOMER_TAB_INDIVIDUALS

  // Sync tab -> URL. Individuals es default, así que se omite el param
  // para mantener la URL corta. `replace` para no ensuciar el history con
  // cada toggle.
  const handleTabChange = useCallback(
    (value: string) => {
      const next = value === CUSTOMER_TAB_GROUPS ? `?tab=${CUSTOMER_TAB_GROUPS}` : ''

      router.replace(`${pathname}${next}`, { scroll: false })
    },
    [pathname, router]
  )

  return (
    <Tabs className='mt-10 grow' value={activeTab} onValueChange={handleTabChange}>
      <TabsList className='rounded-full bg-primary w-full max-w-[400px] h-12 '>
        <TabsTrigger
          className='hover:cursor-pointer rounded-full font-secondary font-bold'
          value={CUSTOMER_TAB_INDIVIDUALS}
        >
          {t('customer.tabIndividuals')}
        </TabsTrigger>
        <TabsTrigger
          className='hover:cursor-pointer rounded-full font-secondary font-bold'
          value={CUSTOMER_TAB_GROUPS}
        >
          {t('customer.tabGroups')}
        </TabsTrigger>
      </TabsList>
      <TabsContent value={CUSTOMER_TAB_INDIVIDUALS}>
        <Button className='h-14 px-1!' variant={'link'}>
          <Link className='flex justify-start gap-x-3 items-center' href={CUSTOMER_NEW}>
            <PlusRoundedIcon className='size-6' />
            <span>{t('customer.addNew')}</span>
          </Link>
        </Button>
        <ListCustomers initialCustomers={initialCustomers} />
      </TabsContent>
      <TabsContent value={CUSTOMER_TAB_GROUPS}>
        <Button className='h-14 px-1!' variant={'link'}>
          <Link className='flex justify-start gap-x-3 items-center' href={CUSTOMER_GROUPS_NEW}>
            <PlusRoundedIcon className='size-6' />
            <span>{t('groups.addNew')}</span>
          </Link>
        </Button>
        <ListGroups />
      </TabsContent>
    </Tabs>
  )
}
