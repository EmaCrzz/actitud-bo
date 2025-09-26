'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Accordion } from '@/components/ui/accordion'
import { BicepsFlexed, SearchIcon, X } from 'lucide-react'
import { useTranslations } from '@/lib/i18n/context'
import { normalizeText } from '@/lib/utils/text'
import { Button } from '@/components/ui/button'
import { useCustomerCache } from '@/customer/cache-context'
import { MembershipTranslation } from '@/membership/consts'
import { LoadingCustomerListStats } from './loading'

export default function CustomerActives() {
  const { t } = useTranslations()
  const { actives: activeData, isLoading, error } = useCustomerCache()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) {
      return activeData
    }

    const normalizedSearch = normalizeText(searchTerm)

    return activeData.filter((membership) => {
      const customer = membership.customers
      const fullName = normalizeText(`${customer.first_name} ${customer.last_name}`)
      const firstName = normalizeText(customer.first_name)
      const lastName = normalizeText(customer.last_name)

      return (
        fullName.includes(normalizedSearch) ||
        firstName.includes(normalizedSearch) ||
        lastName.includes(normalizedSearch)
      )
    })
  }, [searchTerm, activeData])

  if (isLoading) {
    return (
      <LoadingCustomerListStats />
    )
  }

  if (error) {
    return (
      <Card className='py-3 sm:py-6'>
        <CardHeader className='px-4 sm:px-6'>
          <CardTitle className='flex items-center gap-2 text-white/70'>
            <BicepsFlexed className='h-5 w-5 text-yellow-600' />
            {t('membership.activeClients')}
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3 px-4 sm:px-6 text-red-500'>
          <p>{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (activeData.length === 0) {
    return (
      <div className='text-center text-gray-500'>
        <p className='text-sm'>{t('membership.noActiveClients')}</p>
      </div>
    )
  }

  return (
    <div className='space-y-3'>
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
          <Accordion collapsible className='flex flex-col gap-y-2' type='single'>
            {filteredData.map(({ customers: customer, membership_type }, index) => (
              <div
                key={customer.id}
                className='flex items-center gap-3 p-3 bg-input-background rounded'
              >
                <div className='flex items-center justify-center size-10 bg-primary rounded-full border'>
                  <span className='text-sm text-white'>{filteredData.length - index}</span>
                </div>
                <div className='flex flex-col gap-1 grow'>
                  <p className='text-sm text-left sm:text-bas'>
                    {customer.first_name} {customer.last_name}
                  </p>
                  <p className='text-xs text-left'>
                    {MembershipTranslation[membership_type as keyof typeof MembershipTranslation] ||
                      ''}
                  </p>
                </div>
              </div>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  )
}
