import { MembershipTranslation } from '@/membership/consts'
import PencilIcon from '@/components/icons/pencil'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CUSTOMER_EDIT } from '@/consts/routes'
import { CustomerComplete } from '@/customer/types'
import { formatPersonId } from '@/lib/format-person-id'
import { formatPhone } from '@/lib/format-phone'
import Link from 'next/link'

export default function InfoResume({ customer }: { customer: CustomerComplete }) {
  return (
    <section>
      <section className='p-4 grid gap-y-8 bg-input-background rounded-[4px] border-[0.5px] border-input-border'>
        <div className='flex justify-between'>
          <Label className='font-light text-xl leading-6 text-primary300'>Datos Personales</Label>
          <Button size={'icon'} variant='icon'>
            <Link href={`${CUSTOMER_EDIT}/${customer.id}`}>
              <PencilIcon className='size-6' />
            </Link>
          </Button>

        </div>
        <div className='flex justify-between'>
          <div className='grid gap-y-2'>
            <Label className='font-light text-xs leading-6'>Nombre y apellido</Label>
            <span className='font-medium leading-6'>
              {customer.first_name} {customer.last_name}
            </span>
          </div>
        </div>
        <div className='grid gap-y-2'>
          <Label className='font-light text-xs leading-6'>DNI</Label>
          <span className='font-medium leading-6'>{formatPersonId(customer.person_id)}</span>
        </div>
        <div className='grid gap-y-2'>
          <Label className='font-light text-xs leading-6'>Tipo de Membresía</Label>
          <span className='font-medium leading-6'>
            {customer.customer_membership?.membership_type
              ? MembershipTranslation[customer.customer_membership?.membership_type]
              : 'Sin membresía'}
          </span>
        </div>
        <div className='grid gap-y-2'>
          <Label className='font-light text-xs leading-6'>Contacto telefónico</Label>
          <span className='font-medium leading-6'>
            {customer.phone ? formatPhone(customer.phone) : '-'}
          </span>
        </div>
      </section>
    </section>
  )
}
