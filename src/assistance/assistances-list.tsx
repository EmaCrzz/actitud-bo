import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarCheck } from 'lucide-react'
import { getTodayAssistances } from '@/assistance/api/server'
import { DateDisplay } from '@/components/date-display'
import { Skeleton } from '@/components/ui/skeleton'

export default async function AssistancesList() {
  const assistances = await getTodayAssistances()

  return (
    <Card className='py-4 sm:py-6'>
      <CardHeader className='px-4 sm:px-6'>
        <CardTitle className='flex items-center gap-2 text-white/70'>
          <CalendarCheck className='h-5 w-5 text-yellow-600' />
          Asistencias del dia
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-3 px-4 sm:px-6'>
        {assistances.length === 0 && (
          <div className='text-center text-gray-500'>
            <p className='text-sm'>No hay asistencias registradas hoy.</p>
          </div>
        )}

        {assistances.map((item, index) => (
          <div
            key={item.id}
            className='flex items-center justify-between p-2 sm:p-3 bg-inputhover rounded'
          >
            <div className='flex items-center gap-3'>
              <div className='flex items-center justify-center w-8 h-8 bg-primary200 rounded-full'>
                <span className='text-sm font-bold text-white/70'>#{index + 1}</span>
              </div>
              <div>
                <p className='font-medium text-gray-300'>
                  {item.customers.first_name} {item.customers.last_name}
                </p>
                <DateDisplay
                  className='text-xs text-gray-500'
                  date={item.assistance_date}
                  format='relative'
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export const AssistancesListSkeleton = () => {
  return (
    <Card className='py-4 sm:py-6'>
      <CardHeader className='px-4 sm:px-6'>
        <CardTitle className='flex items-center gap-2 text-white/70'>
          <CalendarCheck className='h-5 w-5 text-yellow-600' />
          Asistencias del dia
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-3 px-4 sm:px-6'>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className='flex items-center justify-between p-2 sm:p-3 bg-inputhover rounded'
          >
            <div className='flex items-center gap-3'>
              <Skeleton className='bg-alert w-8 h-8 rounded-full' />
              <div>
                <Skeleton className='bg-alert h-6 w-52 mb-1' />
                <Skeleton className='bg-alert h-4 w-32' />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
