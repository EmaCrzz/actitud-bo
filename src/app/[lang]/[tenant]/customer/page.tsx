import ArrowLeftIcon from '@/components/icons/arrow-left'

import FooterNavigation from '@/components/nav'
import { Button } from '@/components/ui/button'
import { HOME } from '@/consts/routes'
import { searchAllCustomers } from '@/customer/api/server'
import ListWithTabs from '@/customer/list-with-tabs'
import Link from 'next/link'
import { getServerT } from '@/lib/i18n/server'

export default async function CustomerListPage() {
  const { t } = await getServerT()
  const { customers: initialCustomers } = await searchAllCustomers({ page: 0 })

  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
        <div className='flex gap-4 items-center'>
          <Button className='size-6 rounded-full' variant='ghost'>
            <Link href={HOME}>
              <ArrowLeftIcon className='size-6' />
            </Link>
          </Button>
          <h5 className='font-medium text-sm font-headline'>{t('customer.titlePlural')}</h5>
        </div>
      </header>
      <section className='max-w-3xl mx-auto w-full px-4 overflow-auto pb-4'>
        <ListWithTabs initialCustomers={initialCustomers} />
      </section>
      <FooterNavigation />
    </>
  )
}
