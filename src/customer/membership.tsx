'use client'

import { MembershipTranslationTwoLines } from '@/assistance/consts'
import AlertContainedIcon from '@/components/icons/alert-contained'
import AlertTriangleContained from '@/components/icons/alert-triangle-contained'
import CheckCircleContained from '@/components/icons/check-circle-contained'
import { CustomerComplete } from '@/customer/types'
import { useMemo } from 'react'

export default function CustomerMembership({ customer }: { customer: CustomerComplete }) {
  const today = new Date()
  const membershipTransaltionTowLines = customer.customer_membership?.membership_type
    ? MembershipTranslationTwoLines[customer.customer_membership.membership_type]
    : null
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

  return (
    <div className='grid grid-cols-3 gap-x-3 font-secondary'>
      {membershipTransaltionTowLines && (
        <div className='col-span-1 px-1 py-4 bg-membership-card rounded-[4px] border border-white/20 flex flex-col gap-y-2 items-center justify-start'>
          <span className='text-3xl font-sans font-semibold tracking-[1.28px]'>
            {membershipTransaltionTowLines?.one}
          </span>
          <span className='text-sm font-bold w-[104px] text-center'>
            {membershipTransaltionTowLines?.two}
          </span>
        </div>
      )}
      <div className='col-span-1 px-1 py-4 bg-membership-card rounded-[4px] border border-white/20 flex flex-col gap-y-2 items-center justify-start'>
        {!isExpired && !aboutToExpire && (
          <>
            <CheckCircleContained className='text-green-400 size-10' />
            <span className='text-sm font-bold'>Activo</span>
          </>
        )}
        {isExpired && (
          <>
            <AlertContainedIcon className='text-destructive size-10' />
            <span className='text-sm font-bold'>Vencido</span>
          </>
        )}
        {aboutToExpire && (
          <>
            <AlertTriangleContained className='text-amber-400 size-10' />
            <span className='text-sm font-bold'>Por vencer</span>
          </>
        )}
      </div>
      <div className='col-span-1 px-1 py-4 bg-membership-card rounded-[4px] border border-white/20 flex flex-col gap-y-2 items-center justify-start'>
        <span className='text-3xl font-sans font-semibold tracking-[1.28px]'>
          {customer.assistance_count ?? '-'}
        </span>
        <span className='text-sm font-bold w-[104px] text-center'>Asistencias Totales</span>
      </div>
    </div>
  )
}
