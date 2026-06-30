import { Button } from '@/components/ui/button'
import ArrowLeftIcon from '@/components/icons/arrow-left'
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
      <section className='max-w-3xl mx-auto w-full px-4 py-3 flex flex-col pt-12 grow'>
        <Skeleton className='h-3 w-40 mb-4' />
        <section className='max-w-3xl mx-auto w-full overflow-auto pb-4 grid gap-y-1'>
          <div className='grid gap-y-2 col-span-2'>
            <Skeleton className='h-4 w-1/2' />
            <Skeleton className='h-[50px] w-full mb-4' />
          </div>
          <div className='grid gap-y-2 col-span-2'>
            <Skeleton className='h-4 w-1/2' />
            <Skeleton className='h-[50px] w-full mb-4' />
          </div>
          <div className='grid gap-y-2 col-span-2'>
            <Skeleton className='h-4 w-1/2' />
            <Skeleton className='h-[50px] w-full mb-4' />
          </div>
        </section>
      </section>
      <footer className='px-2 sm:px-4 flex justify-between max-w-3xl gap-2 mx-auto w-full pb-9'>
        <Skeleton className='w-full h-14' />
      </footer>
    </>
  )
}
