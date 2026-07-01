import { requireAdminOrRedirect } from '@/auth/api/server'

export default async function ExpensesLayout({ children }: { children: React.ReactNode }) {
  await requireAdminOrRedirect()

  return <>{children}</>
}
