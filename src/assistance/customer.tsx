'use client'

import CustomerCounter from '@/assistance/customer-counter'
import RegistryBtn from '@/assistance/registry-button'
import { MEMBERSHIP_TYPE_3_DAYS, MembershipTranslationTwoLines } from '@/assistance/consts'
import { useMemo, useState } from 'react'
import { createAssistance } from './api/client'
import { toast } from 'sonner'
import { CustomerComplete } from '@/customer/types'
import { HOME } from '@/consts/routes'
import { useRouter } from 'next/navigation'
import { Alert, AlertTitle } from '@/components/ui/alert'
import AlertContainedIcon from '@/components/icons/alert-contained'
import { Button } from '@/components/ui/button'
import { ChevronRight, InfoIcon } from 'lucide-react'
import AlertTriangleContained from '@/components/icons/alert-triangle-contained'
import CheckCircleContained from '@/components/icons/check-circle-contained'

export default function CustomerAssistance({ customer }: { customer: CustomerComplete }) {
  const [isPending, setIsPending] = useState(false)
  const [daySelected, setDaySelected] = useState<string>()
  const router = useRouter()

  const handleSelectedDay = (day: string) => {
    setDaySelected(day)
  }

  const handleSubmit = async () => {
    setIsPending(true)
    const { error } = await createAssistance({ customer_id: customer.id })

    if (error?.code) {
      setIsPending(false)
      toast.error('Error al registrar asistencia, intente nuevamente', {
        description: error.message,
      })

      return
    }
    setIsPending(false)
    toast.success('¡Listo, asistencia registrada!')
    router.push(HOME)
  }

  const today = new Date()
  const hasAssistanceToday = customer.assistance.some(
    (assistance) => new Date(assistance.assistance_date).toDateString() === today.toDateString()
  )
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
  const fullMembership = useMemo(() => {
    if (!customer.customer_membership?.membership_type) return false
    const { membership_type } = customer.customer_membership

    if (membership_type === MEMBERSHIP_TYPE_3_DAYS && customer.assistance.length === 3) return true

    return false
  }, [customer])
  const disableButton = useMemo(() => {
    if (fullMembership) return false

    return !daySelected || hasAssistanceToday
  }, [fullMembership, daySelected, hasAssistanceToday])

  return (
    <>
      <div className='grow'>
        <div className='grid grid-cols-3 gap-x-3 font-secondary'>
          {membershipTransaltionTowLines && (
            <div className='col-span-1 px-1 py-4 bg-membership-card rounded-[4px] border border-white/20 flex flex-col gap-y-2 items-center justify-between'>
              <span className='text-3xl font-sans font-semibold tracking-[1.28px]'>
                {membershipTransaltionTowLines?.one}
              </span>
              <span className='text-sm font-bold'>{membershipTransaltionTowLines?.two}</span>
            </div>
          )}
          <div className='col-span-1 px-1 py-4 bg-membership-card rounded-[4px] border border-white/20 flex flex-col gap-y-2 items-center justify-between'>
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
          <div className='col-span-1 px-1 py-4 bg-membership-card rounded-[4px] border border-white/20 flex flex-col gap-y-2 items-center justify-between'>
            <span className='text-3xl font-sans font-semibold tracking-[1.28px]'>
              {customer.assistance_count ?? '-'}
            </span>
            <span className='text-sm font-bold'>Total Asist.</span>
          </div>
        </div>
        <Button className='h-14 w-full mt-4' variant={'outline'}>
          {isExpired || aboutToExpire ? 'Renovar membresía' : 'Modificar membresía'}
          <ChevronRight className='size-6' />
        </Button>
        {customer?.customer_membership?.membership_type && (
          <CustomerCounter
            assistanceCount={customer.assistance.length}
            handleSelectedDay={handleSelectedDay}
            isDisabled={hasAssistanceToday}
            membershipType={customer.customer_membership.membership_type}
            selectedDay={daySelected}
          />
        )}
        {hasAssistanceToday && (
          <Alert
            className='mt-6 items-center has-[>svg]:grid-cols-[calc(var(--spacing)*6)_1fr] [&>svg]:size-6'
            variant='destructive'
          >
            <AlertContainedIcon />
            <AlertTitle className='font-secondary font-bold tracking-[0.48px]'>
              Ya se registro una asistencia el dia de hoy
            </AlertTitle>
          </Alert>
        )}
        {fullMembership && (
          <Alert
            className='mt-6 items-center has-[>svg]:grid-cols-[calc(var(--spacing)*6)_1fr] [&>svg]:size-6'
            variant='info'
          >
            <InfoIcon />
            <AlertTitle className='font-secondary font-bold tracking-[0.48px]'>
              ¡Semana completa, sumá un pase diario!
            </AlertTitle>
          </Alert>
        )}
      </div>
      <RegistryBtn
        disabled={disableButton}
        fullMembership={fullMembership}
        loading={isPending}
        loadingText='Un momento'
        onClick={handleSubmit}
      />
    </>
  )
}
