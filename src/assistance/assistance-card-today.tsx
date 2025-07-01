import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'
import { getTotalAssistancesToday } from '@/assistance/api/server'
import { Skeleton } from '@/components/ui/skeleton'

export default async function AssistanceCardToday() {
  const count = await getTotalAssistancesToday()
  const today = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  return (
    <Card className='border-l-4 border-l-primary bg-gradient-to-r from-input to-inputhover'>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-lg text-white/70'>
          <Calendar className='h-5 w-5 text-primary' />
          Asistencias de Hoy
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-2'>
        <div className='text-3xl font-bold text-primary'>{count === 0 ? '-' : count}</div>
        <p className='text-sm text-gray-600'>{today}</p>
        {/* <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600 font-medium">
                +{mockData.todayAssistances.growth}% vs ayer
              </span>
            </div> */}
      </CardContent>
    </Card>
  )
}

export const AssistanceCardTodaySkeleton = () => {
  const today = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  return (
    <Card className='border-l-4 border-l-primary bg-gradient-to-r from-input to-inputhover'>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-lg text-white/70'>
          <Calendar className='h-9 w-5 text-primary' />
          Asistencias de Hoy
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-2'>
        <Skeleton className='h-8 w-16' />
        <p className='text-sm text-gray-600'>{today}</p>
      </CardContent>
    </Card>
  )
}
