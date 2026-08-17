import { redirect } from 'next/navigation'
import { hasFeatureFlag } from '@/feature-flags/api/server'
import { FEATURE_FLAGS } from '@/feature-flags/consts'
import { HOME } from '@/consts/routes'
import { v2FontVariables } from '@/lib/themes/fonts'
import { getCurrentUser, getProfile } from '@/auth/api/server'
import AppShell, { type AppShellUser } from '@/components/v2/AppShell'

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export default async function V2Layout({ children }: { children: React.ReactNode }) {
  const canAccessV2 = await hasFeatureFlag(FEATURE_FLAGS.V2_ACCESS)

  if (!canAccessV2) {
    redirect(HOME)
  }

  const authUser = await getCurrentUser()
  const profile = await getProfile(authUser.id)

  const fullName =
    profile && (profile.first_name || profile.last_name)
      ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
      : (authUser.email ?? 'Usuario')

  const user: AppShellUser = {
    name: fullName,
    email: authUser.email ?? '',
    avatarUrl: profile?.picture ?? null,
    avatarFallback: getInitials(fullName) || (authUser.email?.charAt(0).toUpperCase() ?? 'U'),
    roleLabel: 'Administrador',
  }

  return (
    <div className={`h-dvh ${v2FontVariables}`} data-v2='true'>
      <AppShell user={user}>{children}</AppShell>
    </div>
  )
}
