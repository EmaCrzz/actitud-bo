import { requireAdminOrRedirect } from '@/auth/api/server'

/**
 * Ventas es admin-only, igual que Gastos.
 *
 * La sección une ventas de producto con cuotas de membresía, y
 * `membership_payments` es admin-only por RLS desde
 * `20260702120000_finances_admin_only_rls` (`sales` nace igual). Sin este guard
 * un no-admin vería la sección vacía —PostgREST devuelve cero filas, no un
 * error— y leería "Aún no se registraron ventas" cuando lo que pasa es que no
 * las puede ver. Hoy no le cuesta nada a nadie: los 4 usuarios de prod son
 * admin (medido el 2026-10-01).
 */
export default async function V2SalesLayout({ children }: { children: React.ReactNode }) {
  await requireAdminOrRedirect()

  return <>{children}</>
}
