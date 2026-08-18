import type { Language } from '@/lib/i18n/types'
import type { TenantsType } from '@/lib/tenants'
import AttendanceSearchCard from '@/home/components/v2/AttendanceSearchCard'
import DailySummaryCard from '@/home/components/v2/DailySummaryCard'
import MetricsRow from '@/home/components/v2/MetricsRow'
import QuickActionsSection from '@/home/components/v2/QuickActionsSection'
import WeeklyAttendanceCard from '@/home/components/v2/WeeklyAttendanceCard'
import { getDailySummary, getHomeMetrics, getWeeklyAttendanceSummary } from '@/home/api/server'

interface PageProps {
  params: Promise<{ lang: string; tenant: string }>
}

export default async function V2HomePage({ params }: PageProps) {
  const [{ lang, tenant }, metrics, dailySummary, weeklyAttendance] = await Promise.all([
    params,
    getHomeMetrics(),
    getDailySummary(),
    getWeeklyAttendanceSummary(),
  ])

  return (
    <div className='h-full p-2.5 lg:p-5 rounded-xl border flex flex-col gap-3 lg:gap-6'>
      <AttendanceSearchCard />
      <MetricsRow lang={lang as Language} metrics={metrics} tenant={tenant as TenantsType} />
      <QuickActionsSection />
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <DailySummaryCard
          lang={lang as Language}
          summary={dailySummary}
          tenant={tenant as TenantsType}
        />
        <WeeklyAttendanceCard
          lang={lang as Language}
          tenant={tenant as TenantsType}
          weekly={weeklyAttendance}
        />
      </div>
    </div>
  )
}
