import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'
import { getTotalAssistancesToday } from '@/assistance/api/server'
import { Skeleton } from '@/components/ui/skeleton'
import api from '@/lib/i18n/api'
import { type Language } from '@/lib/i18n/types'
import { type TenantsType } from '@/lib/tenants'

export default async function AssistanceCardToday({
  lang,
  tenant,
}: {
  lang: Language
  tenant: TenantsType
}) {
  const count = await getTotalAssistancesToday()
  const { t } = await api.fetch(lang, tenant)
  const today = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  return (
    <Card className='py-3 sm:py-4 md:py-6 border-l-4 border-l-primary bg-gradient-to-r from-input-background to-input-hover-background'>
      <CardHeader className='px-2 sm:px-6'>
        <CardTitle className='flex items-center gap-2 text-lg text-white/70 font-headline'>
          <Calendar className='h-5 w-5 text-primary' />
          {t('assistance.todayAssistances')}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-2 px-2 sm:px-6'>
        <div className='text-3xl font-bold text-primary font-headline'>
          {count === 0 ? '-' : count}
        </div>
        <p className='text-sm text-gray-600'>{today}</p>
      </CardContent>
    </Card>
  )
}

export const AssistanceCardTodaySkeleton = async ({
  lang,
  tenant,
}: {
  lang: Language
  tenant: TenantsType
}) => {
  const { t } = await api.fetch(lang, tenant)
  const today = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  return (
    <Card className='py-3 sm:py-4 md:py-6 border-l-4 border-l-primary bg-gradient-to-r from-input-background to-input-hover-background'>
      <CardHeader className='px-2 sm:px-6'>
        <CardTitle className='flex items-center gap-2 text-lg text-white/70 font-headline'>
          <Calendar className='h-9 w-5 text-primary' />
          {t('assistance.todayAssistances')}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-2 px-2 sm:px-6'>
        <Skeleton className='h-8 w-16' />
        <p className='text-sm text-gray-600'>{today}</p>
      </CardContent>
    </Card>
  )
}
