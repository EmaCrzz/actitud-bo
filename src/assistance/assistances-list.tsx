import { CalendarCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { getTodayAssistances } from '@/assistance/api/server'
import { DateDisplay } from '@/components/date-display'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export default async function AssistancesList({ collapsible = true }: { collapsible?: boolean }) {
  const assistances = await getTodayAssistances()

  return (
    <Card className='py-4 sm:py-6'>
      <Accordion
        collapsible={collapsible}
        defaultValue={collapsible ? undefined : 'item-1'}
        type='single'
      >
        <AccordionItem value='item-1'>
          <AccordionTrigger
            className='py-0 px-2 sm:px-6 hover:cursor-pointer'
            hiddeSvg={!collapsible}
          >
            <div className='flex gap-2 items-center text-white/70 text-sm'>
              <CalendarCheck className='h-5 w-5 text-yellow-600' />
              Asistencias del dia
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <CardContent className={'space-y-3 px-2 sm:px-6 pt-6'}>
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
                    <div className='flex items-center justify-center size-10 bg-primary200 rounded-full'>
                      <span className='text-sm font-bold text-white/70'>#{index + 1}</span>
                    </div>
                    <div>
                      <p className='text-sm sm:text-base font-medium text-gray-300'>
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  )
}

export const AssistancesListSkeleton = ({ collapsible = true }: { collapsible?: boolean }) => {
  return (
    <Card className='py-4 sm:py-6'>
      <Accordion
        collapsible={collapsible}
        defaultValue={collapsible ? undefined : 'item-1'}
        type='single'
      >
        <AccordionItem value='item-1'>
          <AccordionTrigger
            className='py-0 px-2 sm:px-6 hover:cursor-pointer'
            hiddeSvg={!collapsible}
          >
            <div className='flex gap-2 items-center text-white/70 text-sm'>
              <CalendarCheck className='h-5 w-5 text-yellow-600' />
              Asistencias del dia
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {!collapsible && (
              <CardContent className='space-y-3 px-2 sm:px-6 pt-6'>
                {[0, 1, 2].map((index) => (
                  <div
                    key={index}
                    className='flex items-center justify-between p-2 sm:p-3 bg-inputhover rounded'
                  >
                    <div className='flex items-center gap-3'>
                      <Skeleton className='bg-card w-8 h-8 rounded-full' />
                      <div>
                        <Skeleton className='bg-card h-6 w-52 mb-1' />
                        <Skeleton className='bg-card h-4 w-32' />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  )
}
