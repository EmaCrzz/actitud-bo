'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useTranslations } from '@/lib/i18n/context'
import { BicepsFlexed, SearchIcon, X } from 'lucide-react'
import { normalizeText } from '@/lib/utils/text'
import { Button } from '@/components/ui/button'
import { MembershipTranslation } from '@/membership/consts'
import AlertContainedIcon from '@/components/icons/alert-contained'
import { LoadingCustomerListStats } from './loading'
import { usePendingCustomers } from '@/customer/hooks/use-customer-stats'

export default function CustomerPendings() {
  const { t } = useTranslations()
  const { data: pendingData = [], isLoading, error } = usePendingCustomers()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) {
      return pendingData
    }

    const normalizedSearch = normalizeText(searchTerm)

    return pendingData.filter((customer) => {
      const fullName = normalizeText(`${customer.first_name} ${customer.last_name}`)
      const firstName = normalizeText(customer.first_name)
      const lastName = normalizeText(customer.last_name)

      return (
        fullName.includes(normalizedSearch) ||
        firstName.includes(normalizedSearch) ||
        lastName.includes(normalizedSearch)
      )
    })
  }, [searchTerm, pendingData])

  if (isLoading) {
    return <LoadingCustomerListStats />
  }

  if (error) {
    return (
      <Card className='py-3 sm:py-6'>
        <CardHeader className='px-4 sm:px-6'>
          <CardTitle className='flex items-center gap-2 text-white/70'>
            <BicepsFlexed className='h-5 w-5 text-yellow-600' />
            {t('customer.status.pending')}
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3 px-4 sm:px-6 text-red-500'>
          <p>{error.message || 'Error loading data'}</p>
        </CardContent>
      </Card>
    )
  }

  if (pendingData.length === 0) {
    return (
      <div className='text-center text-gray-500'>
        <p className='text-sm'>{t('membership.noPendingsClients')}</p>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='bg-background sticky top-0 pb-1'>
        <Input
          autoComplete={'off'}
          className='py-0 pl-0 mb-0'
          componentLeft={<SearchIcon className='size-6 text-primary200' />}
          componentRight={
            searchTerm && (
              <Button
                className='h-6 w-6 p-0 hover:bg-transparent hover:text-primary text-primary200'
                size='icon'
                type='button'
                variant='ghost'
                onClick={() => setSearchTerm('')}
              >
                <X className='h-4 w-4' />
              </Button>
            )
          }
          placeholder={t('customer.searchPlaceholder')}
          value={searchTerm}
          variant={'line'}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className='space-y-3'>
        {filteredData.length === 0 && searchTerm ? (
          <div className='text-center text-gray-500 py-4'>
            <p className='text-sm'>No se encontraron resultados</p>
          </div>
        ) : (
          filteredData.map(({ first_name, last_name, id, customer_membership }, index) => (
            <div key={id} className='flex items-center gap-3 p-3 border-b-[0.5px] border-[#8F878A]'>
              <div className='flex items-center justify-center size-10 bg-primary rounded-full border'>
                <span className='text-sm text-white'>{filteredData.length - index}</span>
              </div>
              <div className='flex flex-col gap-1 grow'>
                <p className='text-sm text-left'>
                  {first_name} {last_name}
                </p>
                <p className='text-xs text-left'>
                  {t(
                    MembershipTranslation[
                      customer_membership?.membership_type as keyof typeof MembershipTranslation
                    ]
                  ) || ''}
                </p>
              </div>
              <AlertContainedIcon className='text-red-500 size-8' />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
