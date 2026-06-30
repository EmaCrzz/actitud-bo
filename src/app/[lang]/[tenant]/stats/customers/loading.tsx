import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadingCustomerListStats } from '@/customer/stats/loading'
import { ArrowLeftIcon } from 'lucide-react'

export default function CustomerStatsLoading() {
  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
        <div className='flex gap-4 items-center'>
          <Button className='size-6 rounded-full' variant='ghost'>
            <ArrowLeftIcon className='size-6' />
          </Button>
          <Skeleton className='h-5 w-40' />
        </div>
      </header>

      <section className='px-4 max-w-3xl mx-auto w-full pb-4 grid gap-y-4 overflow-auto auto-rows-max'>
        <div className='text-center text-sm text-muted-foreground'>
          <Skeleton className='h-12 w-[384px] rounded-full' />
          <LoadingCustomerListStats />
        </div>
      </section>
    </>
  )
}
