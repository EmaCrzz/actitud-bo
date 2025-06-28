'use client'
import ArrowLeftIcon from '@/components/icons/arrow-left'
import SelectMembershipHybrid from '@/components/select-membership'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { UncontrolledDatePicker } from '@/components/uncontrolled-date-picker'
import { CustomerComplete } from '@/customer/types'
import { CheckedState } from '@radix-ui/react-checkbox'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { upsertCustomerMembership } from '@/customer/api/client'
import { toast } from 'sonner'
import { DatabaseResult } from '@/types/database-errors'
import { handleDatabaseError } from './errors'
import { CUSTOMER } from '@/consts/routes'
import { InfoIcon } from 'lucide-react'
import { TooltipTrigger, Tooltip, TooltipContent } from '@/components/ui/tooltip'

interface Props {
  pathBack?: string
  customer?: CustomerComplete
  multiStepForm?: boolean
  errors?: Record<string, string>
  defaultValues?: FormData
  callbackSubmitMultiStep?: (formData: FormData) => Promise<void>
}

export default function MembershipForm({
  customer,
  pathBack,
  multiStepForm,
  errors: errorProps,
  callbackSubmitMultiStep,
}: Props) {
  const today = new Date()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [innerErrors, setInnerErrors] = useState<DatabaseResult['data']>()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setInnerErrors(undefined)
    // Handle form submission logic here
    const formData = new FormData(event.currentTarget)

    if (multiStepForm) {
      callbackSubmitMultiStep?.(formData)

      return
    }

    setLoading(true)
    const response = await upsertCustomerMembership({
      customerId: customer?.id || '',
      formData,
    })

    setLoading(false)

    if (!response.success) {
      const errors = handleDatabaseError(response, router)

      if (errors) {
        setInnerErrors(errors)
      }

      return
    } else {
      toast.success(response.message)
      router.push(pathBack || `${CUSTOMER}/${customer?.id}`)
    }
  }

  const [payment, setPayment] = useState<CheckedState>(() => {
    if (!customer?.customer_membership?.last_payment_date) return false
    const lastPaymentDate = new Date(customer.customer_membership.last_payment_date)

    if (lastPaymentDate.toDateString() > today.toDateString()) {
      return false
    }

    return true
  })
  const handleChangeCheckBox = (checked: CheckedState) => {
    setPayment(checked)
  }

  const errors = useMemo(() => {
    if (errorProps) {
      return errorProps
    }

    return innerErrors || {}
  }, [errorProps, innerErrors])

  return (
    <>
      {!multiStepForm && (
        <header className='max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
          <div className='flex gap-4 items-center'>
            <Button
              className='size-6 rounded-full'
              size='icon'
              variant='ghost'
              onClick={() => router.back()}
            >
              <ArrowLeftIcon className='size-6' />
            </Button>
            <h5 className='font-medium text-sm'>Gestión de membresías</h5>
          </div>
        </header>
      )}
      <form id='form-membership' onSubmit={handleSubmit}>
        <section className='max-w-3xl mx-auto w-full px-4 overflow-auto pb-4 pt-12'>
          <h3 className='text-sm sm:text-md mb-4'>Selecciona el tipo de membresía.</h3>
          <div className='grid grid-cols-2 gap-x-4 gap-y-4'>
            <div className='grid gap-y-2 col-span-2'>
              <Label className='font-light' htmlFor='assistance'>
                Tipo de membresía
              </Label>
              <SelectMembershipHybrid
                className='font-light'
                defaultValue={customer?.customer_membership?.membership_type || ''}
                helperText={errors?.membership_type}
                isDisabled={loading}
                isInvalid={!!errors?.membership_type}
                name={'membership_type'}
              />
            </div>
            <div className='grid gap-y-2 col-span-2'>
              <div className='flex items-center gap-3'>
                <Checkbox
                  checked={payment}
                  className='size-6'
                  disabled={loading}
                  id='payment'
                  name='payment'
                  onCheckedChange={handleChangeCheckBox}
                />
                <Label className='text-xs text-white' htmlFor='payment'>
                  ¿Abono la membresía?
                </Label>
              </div>
            </div>
            <UncontrolledDatePicker
              className='w-full col-span-2'
              dateFormat='short'
              helperText={errors?.start_date}
              isDisabled={payment !== true || loading}
              isInvalid={!!errors?.start_date}
              label='Fecha de inicio'
              name='start_date'
            />
            <UncontrolledDatePicker
              className='w-full col-span-2'
              dateFormat='short'
              helperText={errors?.end_date}
              isDisabled={payment !== true || loading}
              isInvalid={!!errors?.end_date}
              label='Fecha de finalización'
              name='end_date'
            />
            <div className='flex items-center gap-3 col-span-2'>
              <Checkbox
                className='size-6'
                disabled={!payment}
                id='first_assistance'
                name='first_assistance'
              />
              <span className='flex items-center gap-2'>
                <Label className='text-xs text-white' htmlFor='first_assistance'>
                  Registrar su primer asistencia
                </Label>
                {!payment && (
                  <Tooltip data-side='left'>
                    <TooltipTrigger asChild>
                      <InfoIcon className='size-4 text-destructive' />
                    </TooltipTrigger>
                    <TooltipContent side='top'>
                      <p className='w-[180px]'>
                        Si no abona la membresía, no podrá registrar asistencias.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </span>
            </div>
            {errors?.first_assistance && (
              <small className='text-xs text-destructive flex items-center gap-2 col-span-2'>
                <InfoIcon className='size-6 text-destructive' />
                {errors.first_assistance}
              </small>
            )}
          </div>
        </section>
      </form>
      {!multiStepForm && (
        <footer className='flex justify-between max-w-3xl gap-2 mx-auto w-full px-4 pb-9'>
          <Button className='w-full h-14' form='form-membership' loading={loading} type='submit'>
            Confirmar
          </Button>
        </footer>
      )}
    </>
  )
}
