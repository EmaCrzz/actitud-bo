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
import { useState } from 'react'
import { updateCustomerMembership } from '@/customer/api/client'
import { toast } from 'sonner'

export default function MembershipForm({
  customer,
  pathBack,
}: {
  customer?: CustomerComplete
  pathBack: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Handle form submission logic here
    setLoading(true)
    const formData = new FormData(event.currentTarget)

    const response = await updateCustomerMembership({
      customerId: customer?.id || '',
      formData,
    })

    setLoading(false)

    if (!response.success) {
      toast.error(response.message)

      return
    } else {
      toast.success(response.message)
      router.push(pathBack)
    }
  }

  const [payment, setPayment] = useState<CheckedState>(false)
  const handleChangeCheckBox = (checked: CheckedState) => {
    setPayment(checked)
  }

  return (
    <>
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
      <form id='form-membership-edit' onSubmit={handleSubmit}>
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
                isDisabled={loading}
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
              className='w-full'
              dateFormat='short'
              isDisabled={payment !== true || loading}
              label='Fecha de inicio'
              name='start_date'
            />
            <UncontrolledDatePicker
              className='w-full'
              dateFormat='short'
              isDisabled={payment !== true || loading}
              label='Fecha de finalización'
              name='end_date'
            />
          </div>
        </section>
      </form>
      <footer className='flex justify-between max-w-3xl gap-2 mx-auto w-full px-4 pb-9'>
        <Button className='w-full h-14' form='form-membership-edit' loading={loading} type='submit'>
          Confirmar
        </Button>
      </footer>
    </>
  )
}
