import { Skeleton } from '@/components/ui/skeleton'

function ExpenseListSkeleton() {
  return (
    <section className='grid gap-8 pt-2'>
      {/* Total del mes */}
      <Skeleton className='h-9 w-1/2 mx-auto rounded' />

      {/* Resumen de gastos */}
      <div className='p-4 rounded bg-input-background border-[0.5px] border-[#DAD7D8]'>
        <div className='flex items-center justify-between border-b border-primary400 pb-2 mb-3'>
          <Skeleton className='h-7 w-1/2 rounded' />
          <Skeleton className='size-8 rounded-full shrink-0' />
        </div>

        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className='flex items-center justify-between gap-4 border-b border-white/10 py-3 first:pt-0 last:border-0 last:pb-0'
          >
            <div className='space-y-1.5'>
              <Skeleton className='h-5 w-[140px]' />
              <Skeleton className='h-4 w-[100px]' />
            </div>
            <Skeleton className='h-5 w-[80px]' />
          </div>
        ))}
      </div>
    </section>
  )
}

export { ExpenseListSkeleton }
