import { redirect } from 'next/navigation'
import { hasFeatureFlag } from '@/feature-flags/api/server'
import { FEATURE_FLAGS } from '@/feature-flags/consts'
import { HOME } from '@/consts/routes'
import { v2FontVariables } from '@/lib/themes/fonts'
import { getCurrentUser, getProfile } from '@/auth/api/server'
import { getServerT } from '@/lib/i18n/server'
import { getIntlLocale } from '@/lib/i18n/locale'
import { formatTodayLongInAppTz } from '@/lib/format-date'
import { getInitials } from '@/lib/format-person'
import AppShell, { type AppShellUser } from '@/components/v2/AppShell'

// Fecha "hoy" formateada en el server. Se pasa al Header como string para
// evitar hydration mismatch (server vs. client pueden diferir en timezone o
// cruce de medianoche) y sacar date-fns del bundle client.
function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default async function V2Layout({ children }: { children: React.ReactNode }) {
  const canAccessV2 = await hasFeatureFlag(FEATURE_FLAGS.V2_ACCESS)

  if (!canAccessV2) {
    redirect(HOME)
  }

  const [authUser, { t, lang }] = await Promise.all([getCurrentUser(), getServerT()])
  const profile = await getProfile(authUser.id)

  const fullName =
    profile && (profile.first_name || profile.last_name)
      ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
      : (authUser.email ?? t('v2.roles.userFallback'))

  const user: AppShellUser = {
    name: fullName,
    email: authUser.email ?? '',
    avatarUrl: profile?.picture ?? null,
    avatarFallback: getInitials(fullName) || (authUser.email?.charAt(0).toUpperCase() ?? 'U'),
    roleLabel: t('v2.roles.admin'),
  }

  return (
    <div className={`h-dvh ${v2FontVariables}`} data-v2='true'>
      <AppShell
        todayLabel={capitalizeFirst(
          formatTodayLongInAppTz(getIntlLocale(lang), { dayStyle: '2-digit' })
        )}
        user={user}
      >
        {children}
      </AppShell>
    </div>
  )
}
