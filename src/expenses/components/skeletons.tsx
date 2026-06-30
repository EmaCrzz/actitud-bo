import { Skeleton } from '@/components/ui/skeleton'

function ExpenseListSkeleton() {
  return (
    <section className='grid gap-6'>
      <div className='sticky top-0 z-20 flex pt-2 bg-background pb-0.5'>
        <div className='flex items-center w-full justify-between backdrop-blur-sm p-4 rounded bg-input-background border-[0.5px] border-[#DAD7D8]'>
          <Skeleton className='h-7 w-1/3 rounded' />
          <Skeleton className='h-7 w-1/4 rounded' />
        </div>
      </div>

      {/* Expenses List */}
      <div className='p-4 rounded bg-input-background border-[0.5px] border-[#DAD7D8]'>
        <div className='flex items-center justify-between border-b border-primary400 pb-[0.5] mb-3'>
          <Skeleton className='h-6 w-3/8 mb-2' />
        </div>

        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className='flex items-center justify-between border-b last:border-0 py-3 last:pb-0'
          >
            <div className='flex-1'>
              <Skeleton className='h-5 w-[150px]' />
              <div className='flex items-center gap-3 mt-1 text-sm text-muted-foreground'>
                <Skeleton className='h-5 w-[100px]' />
                <Skeleton className='h-5 w-[100px]' />
              </div>
            </div>
            <div className='text-right ml-4'>
              <Skeleton className='h-5 w-[100px]' />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export { ExpenseListSkeleton }
