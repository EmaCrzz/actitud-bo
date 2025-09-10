'use client'

import type React from 'react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import ArrowLeftIcon from '@/components/icons/arrow-left'
import CustomerForm from '@/customer/form'
import MembershipForm from '@/customer/membership-form'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { checkCustomerPersonId, upsertCustomer } from '@/customer/api/client'
import { handleDatabaseError } from '@/customer/errors'
import { basicMembershipValidation } from '@/customer/utils'
import { toast } from 'sonner'
import { CUSTOMER } from '@/consts/routes'

export default function SimpleMultiStepForm() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<{ customer?: FormData; membership?: FormData }>({
    customer: undefined,
    membership: undefined,
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isAnimating, setIsAnimating] = useState(false)

  const totalSteps = 2

  const animateStep = (direction: 'next' | 'prev') => {
    setIsAnimating(true)
    setTimeout(() => {
      if (direction === 'next') {
        setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
      } else {
        setCurrentStep((prev) => Math.max(prev - 1, 1))
      }
      setTimeout(() => setIsAnimating(false), 50)
    }, 150)
  }

  const nextStep = async () => {
    animateStep('next')
  }

  const prevStep = () => {
    animateStep('prev')
  }

  useEffect(() => {
    if (currentStep === totalSteps && formData.customer && formData.membership) {
      onSubmit()
    }
  }, [formData])

  const onSubmit = async () => {
    setLoading(true)
    const response = await upsertCustomer({
      formDataCustomer: formData.customer,
      formDataMembership: formData.membership,
    })

    if (!response.success) {
      const errors = handleDatabaseError(response, router)

      if (errors) setErrors(errors)

      return
    }

    setLoading(false)
    toast.success(response.message)
    router.push(`${CUSTOMER}/${response.customer?.id}`)
  }

  const handleValidCustomerForm = async (form: FormData) => {
    setErrors({})
    setLoading(true)
    const checkPersonId = await checkCustomerPersonId({ formData: form })

    if (!checkPersonId.success) {
      const errors = handleDatabaseError(checkPersonId, router)

      if (errors) setErrors(errors)
      setLoading(false)

      return
    }
    setFormData((prev) => ({
      ...prev,
      customer: form,
    }))

    setLoading(false)
    nextStep()

    return
  }

  const handleValidateMembershipForm = async (form: FormData) => {
    setErrors({})

    const { errors, valid } = basicMembershipValidation(form)

    if (!valid) {
      setErrors(errors)
      setLoading(false)

      return
    }

    setFormData((prev) => ({
      ...prev,
      membership: form,
    }))
  }

  const getStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <CustomerForm
            callbackSubmitMultiStep={handleValidCustomerForm}
            defaultValues={formData.customer}
            errors={errors}
            multiStepForm={true}
          />
        )

      case 2:
        return (
          <MembershipForm
            callbackSubmitMultiStep={handleValidateMembershipForm}
            defaultValues={formData.customer}
            errors={errors}
            multiStepForm={true}
          />
        )

      default:
        return null
    }
  }

  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-2 sm:px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
        <div className='flex gap-4 items-center'>
          <Button
            className='size-6 rounded-full'
            variant='ghost'
            onClick={() => {
              if (currentStep === 2) {
                prevStep()

                return
              }
              router.back()
            }}
          >
            <ArrowLeftIcon className='size-6' />
          </Button>
          <h5 className='font-medium text-sm'>Crear un nuevo Cliente</h5>
        </div>
      </header>
      <section className='relative overflow-hidden'>
        <div
          className={`transition-all duration-300 ease-in-out ${
            isAnimating
              ? 'transform translate-x-full opacity-0'
              : 'transform translate-x-0 opacity-100'
          }`}
          style={{ minHeight: '200px' }}
        >
          {getStepContent()}
        </div>
      </section>
      <footer className={cn('max-w-3xl gap-2 mx-auto w-full px-4 pb-9')}>
        {currentStep < totalSteps ? (
          <Button
            // onClick={nextStep}
            className='w-full h-12'
            disabled={isAnimating}
            form='form-customer'
            loading={loading}
            type='submit'
          >
            Siguiente
          </Button>
        ) : (
          <Button
            className='w-full h-12'
            disabled={isAnimating}
            form='form-membership'
            loading={loading}
            loadingText='Creando cliente'
            type='submit'
          >
            Confirmar
          </Button>
        )}
      </footer>
    </>
  )
}
