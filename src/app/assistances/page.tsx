import { getTodayAssistances } from '@/assistance/api/server'
import { DateDisplay } from '@/components/date-display'
import FooterNavigation from '@/components/nav'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HOME, REGISTER_ASSISTANCE } from '@/consts/routes'
import { ArrowLeftIcon, CalendarCheck } from 'lucide-react'
import Link from 'next/link'

export default async function page() {
  const assistances = await getTodayAssistances()

  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
        <div className='flex gap-4 items-center'>
          <Button className='size-6 rounded-full' size='icon' variant='ghost'>
            <Link href={HOME}>
              <ArrowLeftIcon className='size-6' />
            </Link>
          </Button>
          <h5 className='font-medium text-sm'>Asistencias del dia</h5>
        </div>
      </header>
      <section className='max-w-3xl mx-auto w-full px-4 overflow-auto py-4'>
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
                  <div className='flex items-center justify-center w-10 h-10 bg-primary200 rounded-full'>
                    <span className='text-xs font-bold text-white/70'>#{index + 1}</span>
                  </div>
                  <div>
                    <Link href={`${REGISTER_ASSISTANCE}/${item.customers.id}`}>
                      <p className='font-medium text-gray-300 hover:cursor-pointer'>
                        {item.customers.first_name} {item.customers.last_name}
                      </p>
                    </Link>
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
      </section>
      <FooterNavigation />
    </>
  )
}
