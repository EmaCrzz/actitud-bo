import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Award } from 'lucide-react'
import { getTop10CustomersThisMonthRPC } from '@/assistance/api/server'

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
      <CardHeader className='px-4 sm:px-6'>
        <CardTitle className='flex items-center gap-2 text-white/70'>
          <Award className='h-5 w-5 text-yellow-600' />
          Top Asistentes del Mes
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-3 px-4 sm:px-6'>
        {data?.map((assistant, index) => (
          <div
            key={assistant.id}
            className='flex items-center justify-between gap-3 p-3 bg-inputhover rounded'
          >
            <div className='flex items-center justify-center size-10 bg-primary200 rounded-full'>
              <span className='text-sm font-bold text-white/70'>#{index + 1}</span>
            </div>
            <div className='flex items-center justify-between grow'>
              <div>
                <p className='text-sm sm:text-base text-gray-300'>{`${assistant.first_name} ${assistant.last_name}`}</p>
              </div>
            </div>
            <Badge className='whitespace-nowrap text-sm sm:text-base'>
              {assistant.monthly_assistance_count === 1
                ? '1 día'
                : `${assistant.monthly_assistance_count} días`}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
