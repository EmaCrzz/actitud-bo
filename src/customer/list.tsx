'use client'

import { CustomerWithMembership } from '@/customer/types'
import { useMemo, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useDebounce } from 'use-debounce'
import { useIntersectionObserver } from 'usehooks-ts'
import SearchIcon from '@/components/icons/search'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { MEMBERSHIP_TYPE_VIP, MembershipTranslation } from '@/membership/consts'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import EyeIcon from '@/components/icons/eye'
import { StarIcon, X } from 'lucide-react'
import Link from 'next/link'
import { CUSTOMER } from '@/consts/routes'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslations } from '@/lib/i18n/context'
import { fetchCustomersPage } from '@/customer/api/client'
import { CUSTOMERS_PAGE_SIZE } from '@/customer/consts'

interface Props {
  initialCustomers: CustomerWithMembership[]
}

export default function ListCustomers({ initialCustomers }: Props) {
  const [inputValue, setInputValue] = useState('')
  const [debouncedQuery] = useDebounce(inputValue, 400)
  const { t } = useTranslations()

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } = useInfiniteQuery({
    queryKey: ['customers', 'list', debouncedQuery],
    queryFn: ({ pageParam }) =>
      fetchCustomersPage({ query: debouncedQuery || undefined, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < CUSTOMERS_PAGE_SIZE ? undefined : allPages.length,
    initialData: debouncedQuery ? undefined : { pages: [initialCustomers], pageParams: [0] },
  })

  const { ref: sentinelRef } = useIntersectionObserver({
    threshold: 0,
    rootMargin: '200px',
    onChange: (isIntersecting) => {
      if (isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
  })

  const customers = useMemo(() => data?.pages.flat() ?? [], [data])
  const hasCustomers = customers.length > 0
  const isInitialLoading = isFetching && !isFetchingNextPage && customers.length === 0

  return (
    <>
      <div className='bg-background sticky top-0 z-10 pt-1'>
        <Input
          autoComplete={'off'}
          className={'py-0 pl-0 mb-0'}
          componentLeft={<SearchIcon className='size-6 text-primary200' />}
          componentRight={
            inputValue && (
              <Button
                className='h-6 w-6 p-0 hover:bg-transparent hover:text-primary text-primary200'
                size='icon'
                type='button'
                variant='ghost'
                onClick={() => setInputValue('')}
              >
                <X className='h-4 w-4' />
              </Button>
            )
          }
          placeholder={t('customer.searchPlaceholder')}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
      </div>
      <ul className='mt-6'>
        {isInitialLoading &&
          Array.from({ length: 6 }).map((_, index) => (
            <li
              key={`skeleton-${index}`}
              className='grid grid-cols-[1fr_auto] border-b-[0.5px] px-2 py-1 items-center'
            >
              <div className='grid grid-cols-1'>
                <Skeleton className='h-5 w-3/4 sm:w-2/4 mb-2' />
                <Skeleton className='h-5 w-2/4 sm:w-1/4' />
              </div>
              <Skeleton className='h-6 w-6 rounded-full' />
            </li>
          ))}
        {!isInitialLoading && !hasCustomers && (
          <li className='text-center text-sm text-muted-foreground py-4'>
            {t('customer.noCustomersFound', { query: debouncedQuery })}
          </li>
        )}
        {hasCustomers &&
          customers.map((customer, index) => {
            const isLast = index === customers.length - 1
            const isVIPMembership = customer.membership_type === MEMBERSHIP_TYPE_VIP

            return (
              <li
                key={customer.id}
                className={cn('border-b-[0.5px]', isLast && !hasNextPage && 'border-b-0')}
              >
                <Link
                  className='grid grid-cols-[1fr_auto] px-2 py-1 items-center rounded-[4px] transition-colors outline-none hover:bg-input-hover-background active:bg-input-background focus-visible:ring-ring/50 focus-visible:ring-[3px]'
                  href={`${CUSTOMER}/${customer.id}`}
                >
                  <div className='grid grid-cols-1'>
                    <span className='leading-6 text-sm font-medium'>
                      {`${customer.first_name} ${customer.last_name}`}
                    </span>
                    <Label className='font-light text-xs leading-6'>
                      {customer.membership_type
                        ? t(MembershipTranslation[customer.membership_type])
                        : t('membership.noMembership')}
                      {isVIPMembership && <StarIcon className='font-light size-2 inline-block' />}
                    </Label>
                  </div>
                  <span className='size-6 flex items-center justify-center text-primary200'>
                    <EyeIcon className='size-6' />
                  </span>
                </Link>
              </li>
            )
          })}
        {hasNextPage && (
          <li ref={sentinelRef} className='py-4 flex justify-center'>
            {isFetchingNextPage ? (
              <div className='w-full space-y-2'>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`next-skeleton-${index}`}
                    className='grid grid-cols-[1fr_auto] px-2 py-1 items-center'
                  >
                    <div className='grid grid-cols-1'>
                      <Skeleton className='h-5 w-3/4 sm:w-2/4 mb-2' />
                      <Skeleton className='h-5 w-2/4 sm:w-1/4' />
                    </div>
                    <Skeleton className='h-6 w-6 rounded-full' />
                  </div>
                ))}
              </div>
            ) : (
              <span className='text-xs text-muted-foreground'>&nbsp;</span>
            )}
          </li>
        )}
      </ul>
    </>
  )
}

export function CustomerListLoading() {
  const { t } = useTranslations()

  return (
    <>
      <div className='bg-background sticky top-0 z-10 pb-1 pt-6'>
        <Input
          disabled
          autoComplete={'off'}
          className='py-2 pl-0 mb-0'
          componentLeft={<SearchIcon className='size-6 text-primary200' />}
          placeholder={t('customer.searchPlaceholder')}
          variant={'line'}
        />
      </div>
      <ul className='mt-6'>
        {Array.from({ length: 10 }).map((_, index) => {
          const isLast = index === 9

          return (
            <li
              key={index}
              className={cn(
                'grid grid-cols-[1fr_auto] border-b-[0.5px] px-2 py-1 items-center',
                isLast && 'border-b-0'
              )}
            >
              <div className='grid grid-cols-1'>
                <Skeleton className='h-5 w-3/4 sm:w-2/4 mb-2' />
                <Skeleton className='h-5 w-2/4 sm:w-1/4' />
              </div>
              <Skeleton className='h-6 w-6 rounded-full' />
            </li>
          )
        })}
      </ul>
    </>
  )
}
