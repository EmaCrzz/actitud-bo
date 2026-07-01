'use client'

import { Button } from '@/components/ui/button'
import { CUSTOMER_EDIT } from '@/consts/routes'
import Link from 'next/link'
import { CustomerComplete } from './types'
import { useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import { useTranslations } from '@/lib/i18n/context'
import { daysUntilInAppTz, isExpiredInAppTz } from '@/lib/timezone'

export default function BtnEditMembership({ customer }: { customer: CustomerComplete }) {
  const { t } = useTranslations()
  const expirationDate = customer.customer_membership?.expiration_date
  const isExpired = useMemo(() => isExpiredInAppTz(expirationDate), [expirationDate])
  const aboutToExpire = useMemo(() => {
    if (!expirationDate) return false
    const daysLeft = daysUntilInAppTz(expirationDate)

    return daysLeft >= 0 && daysLeft <= 5
  }, [expirationDate])
  const hasMembership = customer.customer_membership?.membership_type

  return (
    <Link href={`${CUSTOMER_EDIT}/${customer.id}/membership`}>
      <Button className='h-14 w-full mt-4' variant={'outline'}>
        {!hasMembership
          ? t('membership.createMembership')
          : isExpired || aboutToExpire
            ? t('membership.renewMembership')
            : t('membership.modifyMembership')}
        <ChevronRight className='size-6' />
      </Button>
    </Link>
  )
}
