import ArrowLeftIcon from '@/components/icons/arrow-left'
import PlusRoundedIcon from '@/components/icons/plus-rounded'

import FooterNavigation from '@/components/nav'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { HOME } from '@/consts/routes'
import { CustomerListLoading } from '@/customer/list'
import Link from 'next/link'

export default async function CustomerListLoadingPage() {
  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-2 sm:px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
        <div className='flex gap-4 items-center'>
          <Button className='size-6 rounded-full' variant='ghost'>
            <Link href={HOME}>
              <ArrowLeftIcon className='size-6' />
            </Link>
          </Button>
          <Skeleton className='h-5 w-40' />
        </div>
      </header>
      <section className='max-w-3xl mx-auto w-full px-2 sm:px-4 overflow-auto pb-4'>
        <Button disabled className='h-14 pl-0!' variant={'link'}>
          <PlusRoundedIcon className='size-6' />
          <Skeleton className='h-5 w-40' />
        </Button>
        <CustomerListLoading />
      </section>
      <FooterNavigation />
    </>
  )
}
