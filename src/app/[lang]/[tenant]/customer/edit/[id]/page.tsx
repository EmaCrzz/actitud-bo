import { searchCustomersById } from '@/customer/api/server'
import CustomerForm from '@/customer/form'
import { getServerT } from '@/lib/i18n/server'

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { t } = await getServerT()
  const customer = await searchCustomersById(id)

  if (!customer) {
    return (
      <div className='max-w-3xl mx-auto w-full px-4 py-6'>
        <h2 className='text-lg font-semibold'>{t('customer.notFound')}</h2>
      </div>
    )
  }

  return <CustomerForm customer={customer} />
}
