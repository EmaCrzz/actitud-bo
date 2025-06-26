'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { CustomerComplete } from '@/customer/types'
import { DatabaseResult } from '@/types/database-errors'
import { handleDatabaseError } from '@/customer/errors'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PersonIdInput } from '@/components/ui/input-person-id'
import { upsertCustomer } from '@/customer/api/client'
import SelectMembership from '@/components/select-membership'
import { CUSTOMER } from '@/consts/routes'

export default function CustomerForm({ customer }: { customer?: CustomerComplete }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<DatabaseResult['data']>()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors(undefined)
    const formData = new FormData(event.currentTarget)

    setLoading(true)

    const response = await upsertCustomer({
      customerId: customer?.id || '',
      formData,
    })

    setLoading(false)

    if (!response.success) {
      const errors = handleDatabaseError(response, router)

      if (errors) {
        setErrors(errors)
      }

      return
    } else {
      toast.success(response.message)

      router.push(`${CUSTOMER}/${customer?.id}`)
    }
  }

  return (
    <>
      <form id='form-edit' onSubmit={handleSubmit}>
        <section className='max-w-3xl mx-auto w-full px-4 overflow-auto pb-4 pt-12'>
          <h3 className='text-sm sm:text-md mb-4'>
            {customer
              ? 'Puedes modificar el formulario para actualizar la información de este cliente.'
              : 'Completá el formulario para dar de alta un nuevo cliente.'}
          </h3>
          <div className='grid gap-y-4'>
            <div className='grid gap-y-2'>
              <Label className='font-light' htmlFor='assistance'>
                Nombre
              </Label>
              <Input
                className='w-full font-light'
                defaultValue={customer?.first_name || ''}
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
                defaultValue={customer?.last_name || ''}
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
                defaultValue={customer?.person_id || ''}
                helperText={errors?.person_id}
                isInvalid={!!errors?.person_id}
                name={'person_id'}
              />
            </div>
            <div className='grid gap-y-2'>
              <Label className='font-light' htmlFor='assistance'>
                Tipo de membresía
              </Label>
              <SelectMembership
                className='font-light'
                defaultValue={customer?.customer_membership?.membership_type || ''}
                helperText={errors?.membership_type}
                isInvalid={!!errors?.membership_type}
                name={'membership_type'}
              />
            </div>
            <div className='grid gap-y-2'>
              <Label className='font-light' htmlFor='assistance'>
                Contacto telefónico
              </Label>
              <Input defaultValue={customer?.phone || ''} name={'phone'} />
            </div>
            <div className='flex items-center gap-3'>
              <Checkbox className='size-6' id='first-assistance' name='first-assistance' />
              <Label className='text-xs text-white' htmlFor='first-assistance'>
                Registrar su primer asistencia
              </Label>
            </div>
          </div>
        </section>
      </form>
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
          form='form-edit'
          loading={loading}
          type='submit'
        >
          Guardar
        </Button>
      </footer>
    </>
  )
}
