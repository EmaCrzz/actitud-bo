import { DateDisplay } from '@/components/date-display'
import AlertTriangleContained from '@/components/icons/alert-triangle-contained'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getActiveMemberships } from '@/membership/api/server'
import { BicepsFlexed, CalendarCheck } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import api from '@/lib/i18n/api'
import { type Language } from '@/lib/i18n/types'
import { type TenantsType } from '@/lib/tenants'
export default async function ActivesMembership({
  lang,
  tenant,
}: {
  lang: Language
  tenant: TenantsType
}) {
  const { data, error } = await getActiveMemberships()
  const { t } = await api.fetch(lang, tenant)

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
          <p>{t('membership.errorLoadingActiveClients')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className='py-3 sm:py-6'>
      <Accordion collapsible type='single'>
        <AccordionItem value='item-1'>
          <AccordionTrigger className='py-0 px-2 sm:px-6 hover:cursor-pointer'>
            <div className='flex gap-2 items-center text-white/70'>
              <BicepsFlexed className='h-5 w-5 text-yellow-600' />
              {t('membership.activeClients')}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <CardContent className='space-y-3 px-2 sm:px-6 pt-6'>
              {data.map(({ customers, expiration_date }, index) => {
                const today = new Date()
                const expirationDate = expiration_date ? new Date(expiration_date) : null
                const fiveDaysFromNow = new Date(today)

                fiveDaysFromNow.setDate(today.getDate() + 5)
                const aboutToExpire =
                  expirationDate && expirationDate > today && expirationDate <= fiveDaysFromNow

                return (
                  <div
                    key={customers.id}
                    className='flex items-center justify-between gap-3 p-3 bg-inputhover rounded'
                  >
                    <div className='flex items-center justify-center size-10 bg-primary200 rounded-full'>
                      <span className='text-sm font-bold text-white/70'>#{index + 1}</span>
                    </div>
                    <div className='flex items-start justify-between grow'>
                      <div>
                        <p className='text-sm sm:text-base text-gray-300'>
                          {customers.first_name} {customers.last_name}
                        </p>

                        <div className='flex gap-2 text-xs text-gray-500 items-center'>
                          <span className='block sm:hidden'>
                            {expiration_date && t('membership.endShort')}
                          </span>
                          <span className='hidden sm:block'>
                            {expiration_date && t('membership.endDate')}
                          </span>
                          {expiration_date ? (
                            <DateDisplay date={expiration_date} format='short' />
                          ) : (
                            '-'
                          )}
                        </div>
                      </div>
                      {!aboutToExpire && <CalendarCheck className='size-6 text-green-500' />}
                      {aboutToExpire && (
                        <AlertTriangleContained className='size-6 text-amber-400' />
                      )}
                    </div>
                  </div>
                )
              })}
              {data.length === 0 && (
                <div className='text-center text-gray-500'>
                  <p className='text-sm'>{t('membership.noActiveClients')}</p>
                </div>
              )}
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  )
}

export const ActivesMembershipSkeleton = async ({
  lang,
  tenant,
}: {
  lang: Language
  tenant: TenantsType
}) => {
  const { t } = await api.fetch(lang, tenant)

  return (
    <Card className='py-3 sm:py-6'>
      <Accordion collapsible type='single'>
        <AccordionItem value='item-1'>
          <AccordionTrigger className='py-0 px-2 sm:px-6 hover:cursor-pointer'>
            <div className='flex gap-2 items-center text-white/70'>
              <BicepsFlexed className='h-5 w-5 text-yellow-600' />
              {t('membership.activeClients')}
            </div>
          </AccordionTrigger>
          <AccordionContent />
        </AccordionItem>
      </Accordion>
    </Card>
  )
}
