import AttendanceSearchCard from '@/home/components/v2/AttendanceSearchCard'
import DailySummaryCard from '@/home/components/v2/DailySummaryCard'
import MetricsRow from '@/home/components/v2/MetricsRow'
import QuickActionsSection from '@/home/components/v2/QuickActionsSection'
import WeeklyAttendanceCard from '@/home/components/v2/WeeklyAttendanceCard'
import { getDailySummary, getHomeMetrics, getWeeklyAttendanceSummary } from '@/home/api/server'

export default async function V2HomePage() {
  const [metrics, dailySummary, weeklyAttendance] = await Promise.all([
    getHomeMetrics(),
    getDailySummary(),
    getWeeklyAttendanceSummary(),
  ])

  return (
    // `min-h-full` y no `h-full`: el card tiene que ocupar al menos el alto
    // disponible (para que el borde llegue abajo cuando hay poco contenido) pero
    // poder crecer cuando no entra. Con `h-full` el contenido desbordaba el
    // borde y se dibujaba sobre el fondo del tenant v1. El scroll lo pone el
    // `<main>` del AppShell.
    <div className='min-h-full p-2.5 lg:p-5 rounded-xl border flex flex-col gap-3 lg:gap-6'>
      <AttendanceSearchCard />
      <MetricsRow metrics={metrics} />
      <QuickActionsSection />
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <DailySummaryCard summary={dailySummary} />
        <WeeklyAttendanceCard weekly={weeklyAttendance} />
      </div>
    </div>
  )
}
