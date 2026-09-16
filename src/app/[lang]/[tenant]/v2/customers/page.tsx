import { searchAllCustomers } from '@/customer/api/server'
import CustomersSection from '@/customer/components/v2/CustomersSection'
import { parseCustomerFilters } from '@/customer/filters'

interface V2CustomersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// Los filtros viven en la URL para que la vista sea compartible y para que el
// card "Clientes activos del mes" del home pueda linkear acá ya filtrado.
// La primera página se resuelve en el server; el cliente pagina desde ahí.
export default async function V2CustomersPage({ searchParams }: V2CustomersPageProps) {
  const filters = parseCustomerFilters(await searchParams)
  const initialCustomers = await searchAllCustomers({ ...filters, page: 0 })

  return (
    <div className='flex h-full min-h-0 flex-col rounded-lg border p-2.5 lg:p-5'>
      <CustomersSection initialCustomers={initialCustomers} initialFilters={filters} />
    </div>
  )
}
