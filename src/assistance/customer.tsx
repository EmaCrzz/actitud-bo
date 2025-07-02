'use client'

import CustomerCounter from '@/assistance/customer-counter'
import RegistryBtn from '@/assistance/registry-button'
import { MEMBERSHIP_TYPE_3_DAYS } from '@/membership/consts'
import { useMemo, useState } from 'react'
import { createAssistance } from './api/client'
import { toast } from 'sonner'
import { CustomerComplete } from '@/customer/types'
import { HOME } from '@/consts/routes'
import { useRouter } from 'next/navigation'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { InfoIcon } from 'lucide-react'
import CustomerMembership from '@/customer/membership'
import BtnEditMembership from '@/customer/btn-edit-membership'
import AssistanceToday from './assistance-alert-today'

export default function CustomerAssistance({ customer }: { customer: CustomerComplete }) {
  const [isPending, setIsPending] = useState(false)
  const [daySelected, setDaySelected] = useState<string>()
  const router = useRouter()
  const today = new Date()

  const handleSelectedDay = (day: string) => {
    setDaySelected((prev) => {
      if (prev === day) return undefined // Deselect if the same day is clicked

      return day
    })
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

  const hasAssistanceToday = customer.assistance.some(
    (assistance) => new Date(assistance.assistance_date).toDateString() === today.toDateString()
  )
  const fullMembership = useMemo(() => {
    if (!customer.customer_membership?.membership_type) return false
    const { membership_type } = customer.customer_membership

    if (membership_type === MEMBERSHIP_TYPE_3_DAYS && customer.assistance.length === 3) {
      if (
        new Date(customer.assistance[2].assistance_date).toDateString() === today.toDateString()
      ) {
        return false
      }

      return true
    }

    return false
  }, [customer])
  const disableButton = useMemo(() => {
    if (fullMembership) return false

    return !daySelected || hasAssistanceToday
  }, [fullMembership, daySelected, hasAssistanceToday])

  return (
    <>
      <div className='grow'>
        <CustomerMembership customer={customer} />
        <BtnEditMembership customer={customer} />
        {customer?.customer_membership?.membership_type && (
          <CustomerCounter
            assistanceCount={customer.assistance.length}
            handleSelectedDay={handleSelectedDay}
            isDisabled={hasAssistanceToday}
            membershipType={customer.customer_membership.membership_type}
            selectedDay={daySelected}
          />
        )}
        <AssistanceToday assistance={customer.assistance} />
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
