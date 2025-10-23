import ArrowLeftIcon from '@/components/icons/arrow-left'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export default async function EditMembershipLoading() {
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
      <section className='max-w-3xl mx-auto w-full px-4 overflow-auto pb-4 pt-12'>
        <Skeleton className='h-5 w-16 mb-4' />
        <div className='grid grid-cols-2 gap-x-4 gap-y-4'>
          <div className='grid gap-y-2 col-span-2'>
            <Skeleton className='h-4 w-1/2' />
            <Skeleton className='h-[50px] w-full mb-4' />
          </div>
          <div className='grid gap-y-2 col-span-2'>
            <div className='flex items-center gap-3'>
              <Skeleton className='size-6' />
              <Skeleton className='h-6 w-1/2' />
            </div>
          </div>
          <Skeleton className='h-[50px] col-span-2 sm:col-span-1 w-full mb-4' />
          <Skeleton className='h-[50px] col-span-2 sm:col-span-1 w-full mb-4' />
          <div className='flex items-center gap-3'>
            <Skeleton className='size-6' />
            <Skeleton className='h-6 w-3/4 sm:w-1/2' />
          </div>
        </div>
      </section>
      <footer className='flex justify-between max-w-3xl gap-2 mx-auto w-full px-4 pb-9'>
        <Skeleton className='w-full h-14' />
      </footer>
    </>
  )
}
