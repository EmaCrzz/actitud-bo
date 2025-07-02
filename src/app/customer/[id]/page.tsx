import ArrowLeftIcon from '@/components/icons/arrow-left'
import { Button } from '@/components/ui/button'
import { CUSTOMER } from '@/consts/routes'
import { searchCustomersById } from '@/customer/api/server'
import BtnEditMembership from '@/customer/btn-edit-membership'
import InfoResume from '@/customer/info-resume'
import CustomerMembership from '@/customer/membership'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const customer = await searchCustomersById(id)

  if (!customer) {
    return (
      <div className='max-w-3xl mx-auto w-full px-2 sm:px-4 py-6'>
        <h2 className='text-lg font-semibold'>Cliente no encontrado</h2>
      </div>
    )
  }

  const hasMembership = customer.customer_membership?.membership_type

  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-2 sm:px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
        <div className='flex gap-4 items-center'>
          <Button className='size-6 rounded-full' size='icon' variant='ghost'>
            <Link href={CUSTOMER}>
              <ArrowLeftIcon className='size-6' />
            </Link>
          </Button>
          <h5 className='font-medium text-sm'>Perfil del cliente</h5>
        </div>
      </header>
      <section className='max-w-3xl mx-auto w-full px-2 sm:px-4 overflow-auto pb-4 flex flex-col gap-y-5'>
        <h2 className={cn('text-2xl font-semibold mt-6')}>
          {customer.first_name} {customer.last_name}
        </h2>
        {hasMembership && <CustomerMembership customer={customer} />}
        <BtnEditMembership customer={customer} />
        <InfoResume customer={customer} />
      </section>
    </>
  )
}
