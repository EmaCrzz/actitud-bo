import { requireAdminOrRedirect } from '@/auth/api/server'

export default async function EditMembershipLayout({ children }: { children: React.ReactNode }) {
  await requireAdminOrRedirect()

  return <>{children}</>
}
