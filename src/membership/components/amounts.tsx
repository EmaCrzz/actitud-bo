import { MembershipTranslation, MEMBERSHIP_TYPE_VIP, MembershipTypes } from '../consts'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import PencilIcon from '@/components/icons/pencil'
import Link from 'next/link'
import { MEMBERSHIP, STATS } from '@/consts/routes'
import { formatCurrency } from '@/lib/format-currency'
import { formatDate } from '@/lib/format-date'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslations } from '@/lib/i18n/context'
import { useQuery } from '@tanstack/react-query'
import { getMembershipTypes } from '../api/client'
import { useParams } from 'next/navigation'
import { Language } from '@/lib/i18n/types'

export default function MembershipAmounts() {
  const { t } = useTranslations()
  const params = useParams()
  const { data, isLoading, error } = useQuery({
    queryKey: ['membership-types'],
    queryFn: () => getMembershipTypes(),
  })

  if (isLoading) {
    return <MembershipAmountsLoader />
  }

  if (error || !data?.data || data.error) {
    return <div>Error: {data?.error?.message || error?.message}</div>
  }

  return (
    <div className='p-4 rounded bg-input-background border-[0.5px] border-[#DAD7D8]'>
      <h3 className='border-b pb-[0.5] mb-6 text-primary400 text-start text-xl font-semibold'>
        {t('membership.list')}
      </h3>
      <div className='grid gap-x-3'>
        {data.data.map(({ type, amount, id, last_update }, index) => (
          <div key={id}>
            <div
              className={cn(
                'flex justify-between items-center mb-4 border-b-[0.5px] text-lg pb-1',
                index === data.data.length - 1 && 'border-b-0 mb-0 pb-0'
              )}
            >
              <div className='grid gap-x-1 text-start'>
                <span className='text-sm font-medium'>
                  {t(MembershipTranslation[type as MembershipTypes])}
                </span>
                {type !== MEMBERSHIP_TYPE_VIP && (
                  <span className='text-xs font-medium text-gray-400'>
                    {t('common.lastUpdatedShort')}
                    {': '}
                    {last_update ? formatDate(last_update) : '-'}
                  </span>
                )}
              </div>
              <div className='flex justify-between items-center gap-1'>
                <span className='text-sm font-medium'>
                  {type === MEMBERSHIP_TYPE_VIP
                    ? t('payments.free')
                    : formatCurrency(amount || 0, { lang: params?.lang as Language })}
                </span>
                {type !== MEMBERSHIP_TYPE_VIP && (
                  <Button size={'icon'} variant='icon'>
                    <Link href={`${STATS}${MEMBERSHIP}/edit/${type}`}>
                      <PencilIcon className='size-6' />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MembershipAmountsLoader() {
  return (
    <div className='p-4 rounded bg-input-background border-[0.5px] border-[#DAD7D8]'>
      <Skeleton className='h-8 w-1/3 mb-6' />
      <div className='grid gap-x-3'>
        {[0, 1, 2, 3].map((index) => (
          <div key={index}>
            <div
              className={cn(
                'flex justify-between items-center mb-4 border-b-[0.5px] text-lg pb-1',
                index === 3 && 'border-b-0 mb-0 pb-0'
              )}
            >
              <div className='w-full'>
                <Skeleton className='h-4 w-1/3' />
                {index !== 3 && <Skeleton className='h-3 w-1/2 mt-2' />}
              </div>
              <div className='flex justify-between items-center gap-1'>
                {index !== 3 && <Skeleton className='h-4 w-20' />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
