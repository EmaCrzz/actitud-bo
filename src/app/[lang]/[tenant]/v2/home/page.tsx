import i18n from '@/lib/i18n/api'
import type { Language } from '@/lib/i18n/types'
import type { TenantsType } from '@/lib/tenants'
import MetricCard from '@/components/v2/MetricCard'

interface PageProps {
  params: Promise<{ lang: string; tenant: string }>
}

export default async function V2HomePage({ params }: PageProps) {
  const { lang, tenant } = await params
  const { t } = await i18n.fetch(lang as Language, tenant as TenantsType)

  return (
    <div className='flex flex-col gap-6'>
      {/* Dummy MetricCards para verificar el shell v2. Se conectan a data
          real en Fase 2. */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <MetricCard
          subtitle={t('v2.home.metrics.noAttendancesRegistered')}
          subtitleTone='muted'
          title={t('v2.home.metrics.todayAttendances')}
          value='—'
        />
        <MetricCard
          subtitle={t('v2.home.metrics.expiredMembershipsCount', { count: 10 })}
          subtitleTone='warning'
          title={t('v2.home.metrics.activeClientsMonth')}
          value='89'
        />
      </div>

      <div className='rounded-md border border-border bg-card p-6'>
        <h2 className='text-lg font-semibold'>{t('v2.home.placeholder.title')}</h2>
        <p className='mt-2 text-sm text-muted-foreground'>{t('v2.home.placeholder.description')}</p>
      </div>
    </div>
  )
}
