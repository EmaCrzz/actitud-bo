'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { BicepsFlexed, SearchIcon, StarIcon, X } from 'lucide-react'
import { useTranslations } from '@/lib/i18n/context'
import { normalizeText } from '@/lib/utils/text'
import { Button } from '@/components/ui/button'
import {
  MEMBERSHIP_TYPE_VIP,
  MembershipTranslation,
  MembershipTranslationTwoLines,
  PaymentsTranslation,
  PaymentType,
} from '@/membership/consts'
import { LoadingCustomerListStats } from './loading'
import { useActiveCustomers } from '@/customer/hooks/use-customer-stats'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format-currency'
import { formatDate } from '@/lib/format-date'

export default function CustomerActives() {
  const { t } = useTranslations()
  const { data: activeData = [], isLoading, error } = useActiveCustomers()
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
    return <LoadingCustomerListStats />
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
          <p>{error.message || 'Error loading data'}</p>
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
            {filteredData.map(({ customers: customer, membership_type, last_payment }, index) => {
              const isVIPMembership = membership_type === MEMBERSHIP_TYPE_VIP

              return (
                <AccordionItem
                  key={customer.id}
                  className='bg-input-background rounded hover:no-underline border-none'
                  disabled={isVIPMembership}
                  value={`item-${customer.id}`}
                >
                  <AccordionTrigger
                    className={cn(
                      'hover:no-underline hover:cursor-pointer pr-3 py-2 items-center',
                      isVIPMembership && 'disabled:opacity-100'
                    )}
                    hiddeSvg={isVIPMembership}
                  >
                    <div className='flex items-center gap-3 pl-3'>
                      <div className='flex items-center justify-center size-10 bg-primary rounded-full border'>
                        <span className='text-sm text-white'>{filteredData.length - index}</span>
                      </div>
                      <div className='flex flex-col gap-1 grow'>
                        <p className='text-sm text-left sm:text-base'>
                          {customer.first_name} {customer.last_name}
                        </p>
                        <span className='flex items-center text-xs'>
                          {isVIPMembership &&
                            t(
                              MembershipTranslationTwoLines[
                                membership_type as keyof typeof MembershipTranslation
                              ].two
                            )}
                          {isVIPMembership && (
                            <StarIcon className='text-yellow-300 size-3 inline-block ml-1' />
                          )}
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className='px-3'>
                    <section className='grid grid-cols-2 pt-3 border-t-1 gap-y-2'>
                      <span className='text-xs text-start font-extralight'>Membresia</span>
                      <span
                        className={cn(
                          'text-xs justify-end flex items-center lowercase',
                          isVIPMembership && 'uppercase'
                        )}
                      >
                        {t(
                          MembershipTranslationTwoLines[
                            membership_type as keyof typeof MembershipTranslation
                          ].one
                        ) || ''}{' '}
                        {!isVIPMembership &&
                          t(
                            MembershipTranslationTwoLines[
                              membership_type as keyof typeof MembershipTranslation
                            ].two
                          )}
                        {isVIPMembership && (
                          <StarIcon className='text-yellow-300 size-3 inline-block ml-1' />
                        )}
                      </span>
                      <span className='text-xs text-start font-extralight'>Fecha de pago</span>
                      <span className='text-xs justify-end flex items-center'>
                        {last_payment?.payment_date ? formatDate(last_payment.payment_date) : 'N/A'}
                      </span>
                      <span className='text-xs text-start font-extralight'>Monto</span>
                      <span className='text-xs justify-end flex items-center'>
                        {last_payment?.amount ? formatCurrency(last_payment.amount) : 'N/A'}
                      </span>
                      <span className='text-xs text-start font-extralight'>Forma de pago</span>
                      <span className='text-xs justify-end flex items-center capitalize'>
                        {last_payment?.payment_method
                          ? t(PaymentsTranslation[last_payment.payment_method as PaymentType])
                          : 'N/A'}
                      </span>
                    </section>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        )}
      </div>
    </div>
  )
}
