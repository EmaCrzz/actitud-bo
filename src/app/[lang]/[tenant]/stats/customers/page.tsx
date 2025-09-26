import type React from 'react'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { STATS } from '@/consts/routes'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type Language } from '@/lib/i18n/types'
import { type TenantsType } from '@/lib/tenants'
import api from '@/lib/i18n/api'
import ArrowLeftIcon from '@/components/icons/arrow-left'
import CustomerActives from '@/customer/stats/actives'
import CustomerPendings from '@/customer/stats/pendings'
import { CustomerCacheProvider } from '@/customer/cache-context'

export default async function CustomerStatsPage({
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
            <Link href={STATS}>
              <ArrowLeftIcon className='size-6' />
            </Link>
          </Button>
          <h5 className='font-bold text-sm font-headline'>{t('customer.actives')}</h5>
        </div>
      </header>

      <section className='px-4 max-w-3xl mx-auto w-full pb-4 grid gap-y-4 overflow-auto auto-rows-max'>
        <div className='text-center text-sm text-muted-foreground'>
          <CustomerCacheProvider>
            <Tabs className='mt-10 grow' defaultValue='actives'>
              <TabsList className='rounded-full bg-primary w-full max-w-96 h-12'>
                <TabsTrigger
                  className='hover:cursor-pointer rounded-full font-secondary font-bold'
                  value='actives'
                >
                  {t('customer.status.upToDate')}
                </TabsTrigger>
                <TabsTrigger
                  className='hover:cursor-pointer rounded-full font-secondary font-bold'
                  value='pendings'
                >
                  {t('customer.status.pending')}
                </TabsTrigger>
              </TabsList>
              <TabsContent className='mt-10 flex flex-col' value='actives'>
                <CustomerActives />
              </TabsContent>
              <TabsContent className='mt-10 flex flex-col' value='pendings'>
                <CustomerPendings />
              </TabsContent>
            </Tabs>
          </CustomerCacheProvider>
        </div>
      </section>
    </>
  )
}
