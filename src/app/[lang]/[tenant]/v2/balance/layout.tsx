import { requireAdminOrRedirect } from '@/auth/api/server'

/**
 * Balance es admin-only, igual que Ventas y Gastos: lee `membership_payments`,
 * `sales` y `expenses`, las tres admin-only por RLS. Sin el guard, un no-admin
 * vería un balance en cero —PostgREST devuelve cero filas, no un error— y lo
 * leería como un mes sin movimientos.
 */
export default async function V2BalanceLayout({ children }: { children: React.ReactNode }) {
  await requireAdminOrRedirect()

  return <>{children}</>
}
