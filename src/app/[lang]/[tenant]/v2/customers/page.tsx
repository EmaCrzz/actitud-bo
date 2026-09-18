import { isAdmin } from '@/auth/api/server'
import { searchAllCustomers } from '@/customer/api/server'
import CustomersSection from '@/customer/components/v2/CustomersSection'
import { parseCustomerFilters, parseCustomerPage } from '@/customer/filters'

interface V2CustomersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// Los filtros y la página viven en la URL para que la vista sea compartible y
// para que el card "Clientes activos del mes" del home pueda linkear acá ya
// filtrado. La página pedida se resuelve en el server; el cliente navega desde ahí.
export default async function V2CustomersPage({ searchParams }: V2CustomersPageProps) {
  const params = await searchParams
  const filters = parseCustomerFilters(params)
  const page = parseCustomerPage(params)

  // El tab "Pagos" del perfil lee `membership_payments`, que es admin-only a
  // nivel RLS (20260702120000_finances_admin_only_rls). El rol se resuelve acá y
  // baja como prop: para un no-admin la consulta devolvería 0 filas sin error, y
  // el panel diría "no hay pagos" cuando en realidad no los puede ver.
  const [initialPage, canReadPayments] = await Promise.all([
    searchAllCustomers({ ...filters, page }),
    isAdmin(),
  ])

  return (
    // Mobile (`min-h-full`): el card crece con el contenido y scrollea el
    // `<main>` del AppShell — la tabla en mobile son cards apiladas y encerrarlas
    // en una ventanita de 200px era ilegible.
    // Desktop (`md:h-full`): altura fija, y la tabla scrollea adentro dejando
    // filtros y paginador anclados (ver CustomersSection).
    <div className='flex min-h-full flex-col rounded-lg border p-2.5 md:h-full lg:p-5'>
      <CustomersSection
        canReadPayments={canReadPayments}
        initialFilters={filters}
        initialPage={initialPage}
        initialPageIndex={page}
      />
    </div>
  )
}
