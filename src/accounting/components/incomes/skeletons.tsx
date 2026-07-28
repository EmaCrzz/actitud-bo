import { Skeleton } from '@/components/ui/skeleton'

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className='p-4 rounded bg-input-background border-[0.5px] border-[#DAD7D8] animate-pulse'>
      {children}
    </div>
  )
}

export function HeroCobradoSkeleton() {
  return (
    <Card>
      <Skeleton className='h-4 w-20 mb-4' />
      <Skeleton className='h-10 w-48 mb-3' />
      <Skeleton className='h-4 w-32 mb-4' />
      <Skeleton className='h-4 w-40' />
    </Card>
  )
}

export function BillingCycleSkeleton() {
  return (
    <Card>
      <Skeleton className='h-4 w-32 mb-4' />
      <Skeleton className='h-3 w-full mb-2' />
      <Skeleton className='h-4 w-40 mb-4' />
      <Skeleton className='h-px w-full mb-3' />
      <Skeleton className='h-4 w-3/4 mb-2' />
      <Skeleton className='h-4 w-1/2' />
    </Card>
  )
}

export function BreakdownSkeleton() {
  return (
    <Card>
      <Skeleton className='h-4 w-40 mb-4' />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className='mb-3 last:mb-0'>
          <Skeleton className='h-4 w-40 mb-2' />
          <Skeleton className='h-3 w-full mb-1' />
          <Skeleton className='h-3 w-20' />
        </div>
      ))}
    </Card>
  )
}

export function TwoUpSkeleton() {
  return (
    <div className='grid grid-cols-2 gap-3'>
      <Card>
        <Skeleton className='h-4 w-20 mb-4' />
        <Skeleton className='h-4 w-full mb-2' />
        <Skeleton className='h-4 w-full mb-2' />
        <Skeleton className='h-4 w-3/4' />
      </Card>
      <Card>
        <Skeleton className='h-4 w-20 mb-4' />
        <Skeleton className='h-6 w-full mb-2' />
        <Skeleton className='h-4 w-full' />
      </Card>
    </div>
  )
}

export function RecentPaymentsSkeleton() {
  return (
    <Card>
      <Skeleton className='h-4 w-32 mb-4' />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className='py-3 border-b border-white/10 last:border-0'>
          <Skeleton className='h-4 w-40 mb-2' />
          <Skeleton className='h-3 w-32' />
        </div>
      ))}
    </Card>
  )
}

export function MonthlyComparativeSkeleton() {
  return (
    <Card>
      <Skeleton className='h-4 w-32 mb-4' />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className='flex items-center gap-2 mb-2 last:mb-0'>
          <Skeleton className='h-3 w-8' />
          <Skeleton className='h-3 flex-1' />
          <Skeleton className='h-3 w-14' />
        </div>
      ))}
    </Card>
  )
}

export function IncomesDashboardSkeleton() {
  return (
    <div className='flex flex-col gap-3'>
      <HeroCobradoSkeleton />
      <BillingCycleSkeleton />
      <BreakdownSkeleton />
      <TwoUpSkeleton />
      <RecentPaymentsSkeleton />
      <MonthlyComparativeSkeleton />
    </div>
  )
}
