'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CustomerComplete } from '@/customer/types'
import { DatabaseResult } from '@/types/database-errors'
import { handleDatabaseError } from '@/customer/errors'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PersonIdInput } from '@/components/ui/input-person-id'
import { updateCustomer } from '@/customer/api/client'
import { CUSTOMER } from '@/consts/routes'
import { Button } from '@/components/ui/button'
import ArrowLeftIcon from '@/components/icons/arrow-left'

interface Props {
  customer?: CustomerComplete
  multiStepForm?: boolean
  errors?: Record<string, string>
  defaultValues?: FormData
  callbackSubmitMultiStep?: (customer: FormData) => Promise<void>
}

export default function CustomerForm({
  errors: errorProps,
  customer,
  multiStepForm,
  defaultValues: defaultValuesProps,
  callbackSubmitMultiStep,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [innerErrors, setInnerErrors] = useState<DatabaseResult['data']>()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setInnerErrors(undefined)
    const formData = new FormData(event.currentTarget)

    if (multiStepForm) {
      callbackSubmitMultiStep?.(formData)

      return
    }

    setLoading(true)

    const response = await updateCustomer({
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

      router.push(`${CUSTOMER}/${customer?.id}`)
    }
  }

  const errors = useMemo(() => {
    if (errorProps) {
      return errorProps
    }

    return innerErrors || {}
  }, [errorProps, innerErrors])

  const defaultValues = useMemo(() => {
    if (customer) return customer
    if (defaultValuesProps) {
      const values: Record<string, string> = {}

      defaultValuesProps.forEach((value, key) => {
        values[key] = value as string
      })

      return values
    }

    return {
      first_name: '',
      last_name: '',
      person_id: '',
      phone: '',
    }
  }, [customer, defaultValuesProps])

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
            <h5 className='font-medium text-sm'>Editar Cliente</h5>
          </div>
        </header>
      )}
      <form id='form-customer' onSubmit={handleSubmit}>
        <section className='max-w-3xl mx-auto w-full px-4 overflow-auto pb-4 pt-12'>
          <h3 className='text-sm sm:text-md mb-4'>
            {customer
              ? 'Puedes modificar el formulario para actualizar la información de este cliente.'
              : 'Para comenzar, vamos a pedirte los datos personales del cliente.'}
          </h3>
          <div className='grid gap-y-2'>
            <div className='grid gap-y-2'>
              <Label className='font-light' htmlFor='assistance'>
                Nombre
              </Label>
              <Input
                className='w-full font-light'
                defaultValue={defaultValues.first_name}
                helperText={errors?.first_name}
                isInvalid={!!errors?.first_name}
                name={'first_name'}
              />
            </div>
            <div className='grid gap-y-2'>
              <Label className='font-light' htmlFor='assistance'>
                Apellido
              </Label>
              <Input
                className='w-full font-light'
                defaultValue={defaultValues.last_name}
                helperText={errors?.last_name}
                isInvalid={!!errors?.last_name}
                name={'last_name'}
              />
            </div>
            <div className='grid gap-y-2'>
              <Label className='font-light' htmlFor='assistance'>
                DNI
              </Label>
              <PersonIdInput
                className='w-full font-light'
                defaultValue={defaultValues.person_id}
                helperText={errors?.person_id}
                isInvalid={!!errors?.person_id}
                name={'person_id'}
              />
            </div>
            <div className='grid gap-y-2'>
              <Label className='font-light' htmlFor='assistance'>
                Contacto telefónico
              </Label>
              <Input defaultValue={defaultValues.phone || ''} name={'phone'} />
            </div>
          </div>
        </section>
      </form>
      {!multiStepForm && (
        <footer className='flex justify-between max-w-3xl gap-2 mx-auto w-full px-4 pb-9'>
          <Button
            className='w-36 h-12 sm:w-44 sm:h-14'
            loading={loading}
            variant='outline'
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
          <Button
            className='w-36 h-12 sm:w-44 sm:h-14'
            form='form-customer'
            loading={loading}
            type='submit'
          >
            Confirmar
          </Button>
        </footer>
      )}
    </>
  )
}
