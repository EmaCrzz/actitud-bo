import { searchCustomersById } from '@/customer/api/server'
import CustomerForm from '@/customer/form'
import api from '@/lib/i18n/api'
import { type Language } from '@/lib/i18n/types'
import { type TenantsType } from '@/lib/tenants'

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string; lang: Language; tenant: TenantsType }>
}) {
  const { id, lang, tenant } = await params
  const { t } = await api.fetch(lang, tenant)
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
