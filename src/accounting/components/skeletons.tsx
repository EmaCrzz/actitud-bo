import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  title?: string
}
function CardResumeSkeleton({ title }: Props) {
  return (
    <div className='p-4 rounded bg-input-background border-[0.5px] border-[#DAD7D8] animate-pulse'>
      {title ? (
        <h3 className='text-start text-primary400 text-xl font-semibold border-b pb-[0.5] mb-6'>
          {title}
        </h3>
      ) : (
        <Skeleton className='h-6 w-1/3 rounded mb-4' />
      )}
      <Skeleton className='h-8 rounded' />
    </div>
  )
}

export { CardResumeSkeleton }
