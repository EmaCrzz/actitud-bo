import { ChevronDown } from 'lucide-react'
import api from '@/lib/i18n/api'
import type { Language } from '@/lib/i18n/types'
import type { TenantsType } from '@/lib/tenants'
import type { WeeklyAttendance } from '@/home/types'

interface WeeklyAttendanceCardProps {
  weekly: WeeklyAttendance
  lang: Language
  tenant: TenantsType
}

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const

export default async function WeeklyAttendanceCard({
  weekly,
  lang,
  tenant,
}: WeeklyAttendanceCardProps) {
  const { t } = await api.fetch(lang, tenant)
  const max = Math.max(...weekly.map((d) => d.count))

  return (
    <div className='gap-0 p-4 bg-white rounded-lg flex flex-col border'>
      <div className='flex items-center justify-between mb-4'>
        <span className='text-sm font-medium text-muted-foreground'>
          {t('v2.home.weeklyAttendance.title')}
        </span>
        <ChevronDown aria-hidden='true' className='size-4 text-muted-foreground' />
      </div>

      <ul className='flex flex-col gap-3 border rounded-xl p-4'>
        {weekly.map((day, i) => {
          const dayKey = DAY_KEYS[i]
          const label = t(`v2.home.weeklyAttendance.days.${dayKey}`)
          const pct = max === 0 ? 0 : Math.round((day.count / max) * 100)

          return (
            <li key={day.isoDate} className='flex items-center gap-3'>
              <span className='text-sm text-muted-foreground w-8 shrink-0'>{label}</span>
              <div className='relative flex-1 h-2 bg-muted rounded-full overflow-hidden'>
                <div
                  aria-hidden='true'
                  className='absolute left-0 top-0 h-full bg-foreground rounded-full'
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className='text-sm text-muted-foreground tabular-nums w-6 text-right shrink-0'>
                {day.count === 0 ? '-' : day.count}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
