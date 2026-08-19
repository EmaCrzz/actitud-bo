import { redirect } from 'next/navigation'
import { hasFeatureFlag } from '@/feature-flags/api/server'
import { FEATURE_FLAGS } from '@/feature-flags/consts'
import { HOME } from '@/consts/routes'
import { v2FontVariables } from '@/lib/themes/fonts'
import { getCurrentUser, getProfile } from '@/auth/api/server'
import i18n from '@/lib/i18n/api'
import type { Language } from '@/lib/i18n/types'
import type { TenantsType } from '@/lib/tenants'
import { APP_TIMEZONE } from '@/lib/timezone'
import { getInitials } from '@/lib/format-person'
import AppShell, { type AppShellUser } from '@/components/v2/AppShell'

// Fecha "hoy" formateada en el server con timezone AR + locale de la ruta.
// Se pasa al Header como string para evitar hydration mismatch (server vs. client
// pueden diferir en timezone o cruce de medianoche) y sacar date-fns del bundle client.
function formatTodayForHeader(lang: Language): string {
  const raw = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-AR', {
    timeZone: APP_TIMEZONE,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date())

  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export default async function V2Layout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string; tenant: string }>
}) {
  const canAccessV2 = await hasFeatureFlag(FEATURE_FLAGS.V2_ACCESS)

  if (!canAccessV2) {
    redirect(HOME)
  }

  const { lang, tenant } = await params
  const language = lang as Language
  const tenantId = tenant as TenantsType

  const [authUser, { t }] = await Promise.all([
    getCurrentUser(),
    i18n.fetch(language, tenantId),
  ])
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
      <AppShell todayLabel={formatTodayForHeader(language)} user={user}>
        {children}
      </AppShell>
    </div>
  )
}
