import { Card, CardContent } from '@/components/ui/card'
import { getTop10CustomersThisMonthRPC } from '@/assistance/api/server'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Award } from 'lucide-react'

// Componente Badge simple
function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary200 text-white/70 ${className}`}
    >
      {children}
    </span>
  )
}

export default async function TopMonthlyAssintant() {
  const { data } = await getTop10CustomersThisMonthRPC()

  if (!data || data?.length === 0) return null

  return (
    <Card className='py-4 sm:py-6'>
      <Accordion collapsible type='single'>
        <AccordionItem value='item-1'>
          <AccordionTrigger className='py-0 px-2 sm:px-6 hover:cursor-pointer'>
            <div className='flex gap-2 items-center text-white/70'>
              <Award className='h-5 w-5 text-yellow-600' />
              Top Asistentes del Mes
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <CardContent className='space-y-3 px-2 sm:px-6 pt-6'>
              {data?.map((assistant, index) => (
                <div
                  key={assistant.id}
                  className='flex items-center justify-between gap-2 sm:gap-3 p-3 bg-inputhover rounded'
                >
                  <div className='flex items-center justify-center size-10 bg-primary200 rounded-full '>
                    <span className='text-sm font-bold text-white/70'>#{index + 1}</span>
                  </div>
                  <div className='flex items-center justify-between grow gap-2'>
                    <p className='text-sm sm:text-base text-gray-300'>{`${assistant.first_name} ${assistant.last_name}`}</p>
                    <Badge className='whitespace-nowrap text-sm'>
                      {assistant.monthly_assistance_count === 1
                        ? '1 día'
                        : `${assistant.monthly_assistance_count} días`}
                    </Badge>
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

export const TopMonthlyAssintantSkeleton = () => {
  return (
    <Card className='py-4 sm:py-6'>
      <Accordion collapsible type='single'>
        <AccordionItem value='item-1'>
          <AccordionTrigger className='py-0 px-2 sm:px-6 hover:cursor-pointer'>
            <div className='flex gap-2 items-center text-white/70'>
              <Award className='h-5 w-5 text-yellow-600' />
              Top Asistentes del Mes
            </div>
          </AccordionTrigger>
          <AccordionContent />
        </AccordionItem>
      </Accordion>
    </Card>
  )
}
