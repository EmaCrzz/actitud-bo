import type React from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Users, TrendingUp } from 'lucide-react'
import { HOME } from '@/consts/routes'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import ArrowLeftIcon from '@/components/icons/arrow-left'
import FooterNavigation from '@/components/nav'
import AssistanceCardToday, {
  AssistanceCardTodaySkeleton,
} from '@/assistance/assistance-card-today'
import { Suspense } from 'react'
import AssistancesList, { AssistancesListSkeleton } from '@/assistance/assistances-list'
import ActivesMembership, { ActivesMembershipSkeleton } from '@/customer/actives-membership'
import TopMonthlyAssintant, { TopMonthlyAssintantSkeleton } from '@/assistance/top-monthly-assintant'

// Mock data completamente independiente basado en tu esquema SQL
const mockData = {
  todayAssistances: {
    count: 23,
    date: 'Viernes, 21 de junio de 2024',
    growth: 12,
  },
  topAssistants: [
    { name: 'María González', personId: '12.345.678', count: 18 },
    { name: 'Juan Pérez', personId: '23.456.789', count: 16 },
    { name: 'Ana Rodríguez', personId: '34.567.890', count: 15 },
    { name: 'Carlos López', personId: '45.678.901', count: 14 },
    { name: 'Laura Martín', personId: '56.789.012', count: 12 },
  ],
  membershipsByType: [
    {
      type: 'MEMBERSHIP_TYPE_5_DAYS',
      name: '5 Días',
      count: 45,
      percentage: 56,
    },
    {
      type: 'MEMBERSHIP_TYPE_3_DAYS',
      name: '3 Días',
      count: 25,
      percentage: 31,
    },
    {
      type: 'MEMBERSHIP_TYPE_UNLIMITED',
      name: 'Ilimitado',
      count: 10,
      percentage: 13,
    },
  ],
  monthlyComparison: [
    { month: 'Ene', memberships: 65 },
    { month: 'Feb', memberships: 72 },
    { month: 'Mar', memberships: 68 },
    { month: 'Abr', memberships: 80 },
    { month: 'May', memberships: 75 },
    { month: 'Jun', memberships: 80 }, // Mes actual
  ],
}

// Componente Progress simple
function Progress({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
      <div
        className='bg-primary h-2 rounded-full transition-all duration-300'
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

export default async function DashboardStats() {
  const currentMonth = mockData.monthlyComparison[mockData.monthlyComparison.length - 1]
  const previousMonth = mockData.monthlyComparison[mockData.monthlyComparison.length - 2]
  const monthlyGrowth =
    ((currentMonth.memberships - previousMonth.memberships) / previousMonth.memberships) * 100

  const totalMemberships = mockData.membershipsByType.reduce((sum, m) => sum + m.count, 0)
  const maxMonthlyValue = Math.max(...mockData.monthlyComparison.map((m) => m.memberships))

  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
        <div className='flex gap-4 items-center'>
          <Button className='size-6 rounded-full' size='icon' variant='ghost'>
            <Link href={HOME}>
              <ArrowLeftIcon className='size-6' />
            </Link>
          </Button>
          <h5 className='font-medium text-sm'>Estadísticas</h5>
        </div>
      </header>

      <section className='mt-6 px-4 max-w-3xl mx-auto w-full pb-4 grid gap-y-4 overflow-auto'>
        <Suspense fallback={<AssistanceCardTodaySkeleton />}>
          <AssistanceCardToday />
        </Suspense>
        <Suspense fallback={<AssistancesListSkeleton />}>
          <AssistancesList />
        </Suspense>
        <Suspense fallback={<TopMonthlyAssintantSkeleton />}>
          <TopMonthlyAssintant />
        </Suspense>
        <Suspense fallback={<ActivesMembershipSkeleton />}>
          <ActivesMembership />
        </Suspense>

        {/* Membresías por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-white/70'>
              <Users className='h-5 w-5 text-primary' />
              Membresías por Tipo (fake)
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {mockData.membershipsByType.map((membership) => (
              <div key={membership.type} className='space-y-2'>
                <div className='flex justify-between items-center'>
                  <span className='text-sm font-medium text-white/70'>{membership.name}</span>
                  <span className='text-sm text-white/70'>
                    {membership.count} ({membership.percentage}%)
                  </span>
                </div>
                <Progress value={membership.percentage} />
              </div>
            ))}
            <div className='pt-2 border-t border-primary200'>
              <p className='text-sm text-white/70'>
                Total: <span className='font-medium'>{totalMemberships} membresías activas</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Comparación Mensual */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-white/70'>
              <TrendingUp className='h-5 w-5 text-green-600' />
              Evolución Mensual (fake)
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* Gráfico simple con barras */}
            <div className='space-y-3'>
              {mockData.monthlyComparison.map((month, index) => {
                const isCurrentMonth = index === mockData.monthlyComparison.length - 1
                const percentage = (month.memberships / maxMonthlyValue) * 100

                return (
                  <div key={month.month} className='space-y-1'>
                    <div className='flex justify-between items-center'>
                      <span
                        className={`text-sm font-medium ${
                          isCurrentMonth ? 'text-green-700' : 'text-white/70'
                        }`}
                      >
                        {month.month}
                      </span>
                      <span
                        className={`text-sm ${
                          isCurrentMonth ? 'text-green-700 font-bold' : 'text-white/70'
                        }`}
                      >
                        {month.memberships}
                      </span>
                    </div>
                    <div className='w-full bg-primary200 rounded-full h-2'>
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isCurrentMonth ? 'bg-green-500' : 'bg-primary'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Resumen del crecimiento */}
            <div className='pt-3 border-t bg-green-50 p-3 rounded-lg'>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-600'>Crecimiento mensual</span>
                <span
                  className={`text-sm font-bold ${
                    monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {monthlyGrowth >= 0 ? '+' : ''}
                  {monthlyGrowth.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas Adicionales */}
        <div className='grid grid-cols-2 gap-4'>
          <Card>
            <CardContent className='p-4 text-center'>
              <div className='text-2xl font-bold text-indigo-600'>80</div>
              <p className='text-sm text-gray-600'>Clientes Totales (fake)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4 text-center'>
              <div className='text-2xl font-bold text-orange-600'>92%</div>
              <p className='text-sm text-gray-600'>Membresías Activas</p>
            </CardContent>
          </Card>
        </div>

        {/* Membresías que vencen pronto */}
        <Card className='border-l-4 border-l-orange-500'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-orange-700'>
              <Calendar className='h-5 w-5' />
              Vencimientos Próximos (fake)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-2'>
              <div className='flex justify-between items-center p-2 bg-orange-50 rounded'>
                <span className='text-sm font-medium'>Carlos López</span>
                <span className='text-xs text-orange-600'>Vence en 3 días</span>
              </div>
              <div className='flex justify-between items-center p-2 bg-orange-50 rounded'>
                <span className='text-sm font-medium'>Ana Rodríguez</span>
                <span className='text-xs text-orange-600'>Vence en 5 días</span>
              </div>
              <div className='flex justify-between items-center p-2 bg-orange-50 rounded'>
                <span className='text-sm font-medium'>María González</span>
                <span className='text-xs text-orange-600'>Vence en 7 días</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Placeholder para futuras estadísticas */}
        <Card className='border-2 border-dashed border-gray-300'>
          <CardContent className='flex flex-col items-center justify-center py-8 text-center'>
            <div className='w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3'>
              <TrendingUp className='h-6 w-6 text-gray-400' />
            </div>
            <h3 className='font-medium text-white/70 mb-1'>Próximas Estadísticas</h3>
            <p className='text-sm text-gray-500 max-w-sm'>
              Espacio reservado para futuras métricas como ingresos, retención de clientes, horarios
              pico, etc.
            </p>
          </CardContent>
        </Card>

        {/* Footer con última actualización */}
        <div className='text-center pt-4'>
          <p className='text-xs text-gray-500'>Última actualización: 14:30</p>
        </div>
      </section>
      <FooterNavigation />
    </>
  )
}
