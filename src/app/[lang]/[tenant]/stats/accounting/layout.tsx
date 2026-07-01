import { requireAdminOrRedirect } from '@/auth/api/server'

export default async function AccountingStatsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdminOrRedirect()

  return <>{children}</>
}
