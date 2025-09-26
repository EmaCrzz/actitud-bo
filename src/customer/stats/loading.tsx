import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { SearchIcon } from 'lucide-react'

function LoadingCustomerListStats() {
  return (
    <div className='space-y-4'>
      <div className='bg-background sticky top-0 pb-1'>
        <Input
          disabled
          autoComplete={'off'}
          className='py-0 pl-0 mb-0'
          componentLeft={<SearchIcon className='size-6 text-primary200' />}
          variant={'line'}
        />
      </div>

      <div className='space-y-3'>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
           className='flex items-center gap-3 p-3 bg-input-background rounded'
          >
            <Skeleton className='size-10 rounded-full' />
            <div className='flex flex-col gap-1 grow'>
              <Skeleton className='h-4 w-32' />
              <Skeleton className='h-3 w-12' />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { LoadingCustomerListStats }
