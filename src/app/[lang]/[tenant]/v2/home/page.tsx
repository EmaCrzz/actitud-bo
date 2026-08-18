import type { Language } from '@/lib/i18n/types'
import type { TenantsType } from '@/lib/tenants'
import AttendanceSearchCard from '@/home/components/v2/AttendanceSearchCard'
import MetricsRow from '@/home/components/v2/MetricsRow'
import QuickActionsSection from '@/home/components/v2/QuickActionsSection'
import { getHomeMetrics } from '@/home/api/server'

interface PageProps {
  params: Promise<{ lang: string; tenant: string }>
}

// Server Component. Trae las métricas en paralelo (Promise.all interno en
// getHomeMetrics) y compone la home. Las secciones DailySummary y
// WeeklyAttendance del diseño se agregan en el PR siguiente de Fase 2.
export default async function V2HomePage({ params }: PageProps) {
  const [{ lang, tenant }, metrics] = await Promise.all([params, getHomeMetrics()])

  return (
    <div className='h-full p-2.5 lg:p-5 rounded-xl border flex flex-col gap-3 lg:gap-6'>
      <AttendanceSearchCard />
      <MetricsRow lang={lang as Language} metrics={metrics} tenant={tenant as TenantsType} />
      <QuickActionsSection />
    </div>
  )
}
