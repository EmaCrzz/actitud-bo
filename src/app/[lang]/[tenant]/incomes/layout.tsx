import { requireAdminOrRedirect } from '@/auth/api/server'

export default async function IncomesLayout({ children }: { children: React.ReactNode }) {
  await requireAdminOrRedirect()

  return <>{children}</>
}
