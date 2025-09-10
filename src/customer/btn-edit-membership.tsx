'use client'

import { Button } from '@/components/ui/button'
import { CUSTOMER_EDIT } from '@/consts/routes'
import Link from 'next/link'
import { CustomerComplete } from './types'
import { useMemo } from 'react'
import { ChevronRight } from 'lucide-react'

export default function BtnEditMembership({ customer }: { customer: CustomerComplete }) {
  const today = new Date()
  const isExpired = useMemo(() => {
    if (!customer.customer_membership?.expiration_date) return true
    const expirationDate = new Date(customer.customer_membership.expiration_date)

    return expirationDate < today
  }, [])
  const aboutToExpire = useMemo(() => {
    // Check if the membership is about to expire in the next 5 days
    if (!customer.customer_membership?.expiration_date) return false
    const expirationDate = new Date(customer.customer_membership.expiration_date)
    const fiveDaysFromNow = new Date(today)

    fiveDaysFromNow.setDate(today.getDate() + 5)

    return expirationDate > today && expirationDate <= fiveDaysFromNow
  }, [])
  const hasMembership = customer.customer_membership?.membership_type

  return (
    <Link href={`${CUSTOMER_EDIT}/${customer.id}/membership`}>
      <Button className='h-14 w-full mt-4' variant={'outline'} >
        {!hasMembership
          ? 'Crear membresía'
          : isExpired || aboutToExpire
            ? 'Renovar membresía'
            : 'Modificar membresía'}
        <ChevronRight className='size-6' />
      </Button>
    </Link>
  )
}
