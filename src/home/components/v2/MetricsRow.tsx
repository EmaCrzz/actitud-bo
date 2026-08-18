import MetricCard from '@/components/v2/MetricCard'
import i18n from '@/lib/i18n/api'
import type { Language } from '@/lib/i18n/types'
import type { TenantsType } from '@/lib/tenants'
import type { HomeMetrics } from '@/home/types'

type SubtitleTone = 'success' | 'warning' | 'danger' | 'muted'

interface MetricsRowProps {
  metrics: HomeMetrics
  lang: Language
  tenant: TenantsType
}

// Server component. `i18n.fetch` está wrappeado en React.cache, así que llamarlo
// múltiples veces dentro del mismo request (layout + acá) no re-hace el fetch.
export default async function MetricsRow({ metrics, lang, tenant }: MetricsRowProps) {
  const { t } = await i18n.fetch(lang, tenant)

  const attendance = resolveAttendanceSubtitle(metrics, t)
  const activeClients = resolveActiveClientsSubtitle(metrics, t)

  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
      <MetricCard
        subtitle={attendance.subtitle}
        subtitleTone={attendance.tone}
        title={t('v2.home.metrics.todayAttendances')}
        value={metrics.todayCount > 0 ? metrics.todayCount : '—'}
      />
      <MetricCard
        subtitle={activeClients.subtitle}
        subtitleTone={activeClients.tone}
        title={t('v2.home.metrics.activeClientsMonth')}
        value={metrics.activeCount}
      />
    </div>
  )
}

type Translator = Awaited<ReturnType<typeof i18n.fetch>>['t']

interface SubtitleResult {
  subtitle: string
  tone: SubtitleTone
}

// Prioridad del subtítulo de "Asistencias de hoy":
// 1. Sin asistencias hoy → muted "Sin asistencias registradas".
// 2. Sin referencia previa (semana pasada 0 y hoy 0) → mismo caso, cae en (1).
// 3. Delta calculable → success/warning/muted según signo.
function resolveAttendanceSubtitle(metrics: HomeMetrics, t: Translator): SubtitleResult {
  if (metrics.todayCount === 0) {
    return { subtitle: t('v2.home.metrics.noAttendancesRegistered'), tone: 'muted' }
  }

  const delta = metrics.deltaVsLastWeek

  if (delta === null) {
    return { subtitle: t('v2.home.metrics.noAttendancesRegistered'), tone: 'muted' }
  }
  if (delta > 0) {
    return {
      subtitle: t('v2.home.metrics.attendanceDelta.positive', { count: delta }),
      tone: 'success',
    }
  }
  if (delta < 0) {
    return {
      subtitle: t('v2.home.metrics.attendanceDelta.negative', { count: delta }),
      tone: 'warning',
    }
  }

  return { subtitle: t('v2.home.metrics.attendanceDelta.equal'), tone: 'muted' }
}

// Prioridad del subtítulo de "Clientes activos del mes":
// 1. Hay vencidas → danger (rojo del Figma, más urgente).
// 2. Hay vencimientos próximos → warning (amarillo del Figma).
// 3. Ninguno → muted "Todos al día".
function resolveActiveClientsSubtitle(metrics: HomeMetrics, t: Translator): SubtitleResult {
  if (metrics.expiredCount > 0) {
    return {
      subtitle: t('v2.home.metrics.expiredMembershipsCount', { count: metrics.expiredCount }),
      tone: 'danger',
    }
  }
  if (metrics.upcomingExpirationsCount > 0) {
    return {
      subtitle: t('v2.home.metrics.upcomingExpirations', { count: metrics.upcomingExpirationsCount }),
      tone: 'warning',
    }
  }

  return { subtitle: t('v2.home.metrics.allUpToDate'), tone: 'muted' }
}
