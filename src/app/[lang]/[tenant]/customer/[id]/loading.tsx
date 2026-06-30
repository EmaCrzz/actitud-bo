import ArrowLeftIcon from '@/components/icons/arrow-left'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CUSTOMER } from '@/consts/routes'
import Link from 'next/link'

export default async function CustomerDetailPageLoading() {
  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
        <div className='flex gap-4 items-center'>
          <Button className='size-6 rounded-full' variant='ghost'>
            <Link href={CUSTOMER}>
              <ArrowLeftIcon className='size-6' />
            </Link>
          </Button>
          <Skeleton className='h-5 w-40' />
        </div>
      </header>
      <section className='max-w-3xl mx-auto w-full px-4 overflow-auto pb-4 flex flex-col gap-y-5'>
        <Skeleton className='mt-6 h-9 w-1/2 sm:w-1/3' />
        <div className='grid grid-cols-3 gap-x-3 font-secondary'>
          <Skeleton className='col-span-1 min-h-[118px] rounded-[4px] border border-white/20' />
          <Skeleton className='col-span-1 min-h-[118px] rounded-[4px] border border-white/20' />
          <Skeleton className='col-span-1 min-h-[118px] rounded-[4px] border border-white/20' />
        </div>
        <Skeleton className='w-full rounded-[4px] h-14 mt-4' />
        <div>
          <Skeleton className='w-1/2 sm:w-1/3 rounded-[4px] h-4 mb-2' />
          <section className='p-4 grid gap-y-8 bg-card rounded-[4px]'>
            <div className='flex justify-between'>
              <div className='grid gap-y-1'>
                <Skeleton className='h-4 mb-1 w-30' />
                <Skeleton className='h-8 w-60' />
              </div>
            </div>
            <div className='grid gap-y-2'>
              <div className='grid gap-y-1'>
                <Skeleton className='h-4 mb-1 w-30' />
                <Skeleton className='h-8 w-54' />
              </div>
            </div>
            <div className='grid gap-y-2'>
              <div className='grid gap-y-1'>
                <Skeleton className='h-4 mb-1 w-30' />
                <Skeleton className='h-8 w-64' />
              </div>
            </div>
            <div className='grid gap-y-2'>
              <div className='grid gap-y-1'>
                <Skeleton className='h-4 mb-1 w-30' />
                <Skeleton className='h-8 w-56' />
              </div>
            </div>
          </section>
        </div>
      </section>
    </>
  )
}
