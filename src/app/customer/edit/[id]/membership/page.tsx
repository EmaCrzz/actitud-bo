import { REGISTER_ASSISTANCE } from '@/consts/routes'
import { searchCustomersById } from '@/customer/api/server'
import MembershipForm from '@/customer/membership-form'

export default async function EditCustomerMembershipPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const customer = await searchCustomersById(id)

  if (!customer) {
    return (
      <div className='max-w-3xl mx-auto w-full px-4 py-6'>
        <h2 className='text-lg font-semibold'>Cliente no encontrado</h2>
      </div>
    )
  }

  return <MembershipForm customer={customer} pathBack={`${REGISTER_ASSISTANCE}/${id}`} />
}
