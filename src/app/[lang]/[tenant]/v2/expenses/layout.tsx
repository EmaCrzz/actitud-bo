import { requireAdminOrRedirect } from '@/auth/api/server'

/**
 * Gastos es admin-only, igual que en v1 ([../../expenses/layout.tsx]).
 *
 * No es una decisión de esta fase: `expenses` tiene RLS admin-only en las
 * cuatro operaciones desde `20260702120000_finances_admin_only_rls`. Sin este
 * guard un no-admin vería la sección entera vacía —PostgREST devuelve cero
 * filas, no un error— y leería "Aún no se registraron gastos" cuando lo que
 * pasa es que no los puede ver. Mismo problema que el tab Pagos del perfil
 * (decisión #14 del plan), resuelto acá con redirect porque la sección
 * completa es admin y no hay nada que degradar.
 */
export default async function V2ExpensesLayout({ children }: { children: React.ReactNode }) {
  await requireAdminOrRedirect()

  return <>{children}</>
}
