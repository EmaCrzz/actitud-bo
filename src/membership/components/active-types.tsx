import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'
import { getActiveMemberships, getDailyMembershipsThisMonth } from '@/membership/api/server'
import {
  MEMBERSHIP_TYPE_5_DAYS,
  MEMBERSHIP_TYPE_3_DAYS,
  MEMBERSHIP_TYPE_DAILY,
  MembershipTranslation,
} from '@/membership/consts'
import { Skeleton } from '@/components/ui/skeleton'

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

export default async function ActiveTypes() {
  const { data, error } = await getActiveMemberships()
  // getDailyMembershipsThisMonth incluye a los clientes que podrian tener una membresia diaria que su
  // expiration_date sea en el mes actual y esas getActiveMemberships no las contempla
  const { data: dataDaily = [] } = await getDailyMembershipsThisMonth()

  if (!data || error) return null

  const allData = [...data, ...dataDaily]
  // Quizas las configuraciones de fechas de las membresias son diarias
  // podrian no estar bien y se incluirian en getActiveMemberships
  // y getDailyMembershipsThisMonth, por lo que se filtran los clientes duplicados
  const uniqueCustomers = new Map(allData.map((m) => [m.customers.id, m]))
  const allDataFiltered = Array.from(uniqueCustomers.values())
  const length = allData.length
  const membershipsByType = allDataFiltered.reduce(
    (acc, membership) => {
      const type = membership.membership_type

      if (!acc[type]) {
        acc[type] = { name: type, count: 0 }
      }
      acc[type].count += 1

      return acc
    },
    {} as Record<string, { name: string; count: number }>
  )

  if (!Object.keys(membershipsByType).includes(MEMBERSHIP_TYPE_DAILY)) {
    membershipsByType[MEMBERSHIP_TYPE_DAILY] = { name: MEMBERSHIP_TYPE_DAILY, count: 0 }
  }

  return (
    <Card className='py-3 sm:py-6'>
      <CardHeader className='px-2 sm:px-6'>
        <CardTitle className='flex items-center gap-2 text-white/70 text-sm sm:text-base'>
          <Users className='h-5 w-5 text-primary' />
          Membresías por Tipo
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-3 px-2 sm:px-6'>
        <div key={MEMBERSHIP_TYPE_5_DAYS} className='space-y-2'>
          <div className='flex justify-between items-center'>
            <span className='text-xs sm:text-sm font-medium text-white/70'>
              {MembershipTranslation[MEMBERSHIP_TYPE_5_DAYS]}
            </span>
            <span className='text-xs sm:text-sm text-white/70'>
              {`${membershipsByType?.[MEMBERSHIP_TYPE_5_DAYS]?.count} (
                ${((membershipsByType?.[MEMBERSHIP_TYPE_5_DAYS]?.count / length) * 100).toFixed(2)}%)`}
            </span>
          </div>
          <Progress value={(membershipsByType?.[MEMBERSHIP_TYPE_5_DAYS]?.count / length) * 100} />
        </div>
        <div key={MEMBERSHIP_TYPE_3_DAYS} className='space-y-2'>
          <div className='flex justify-between items-center'>
            <span className='text-xs sm:text-sm font-medium text-white/70'>
              {MembershipTranslation[MEMBERSHIP_TYPE_3_DAYS]}
            </span>
            <span className='text-xs sm:text-sm text-white/70'>
              {`${membershipsByType?.[MEMBERSHIP_TYPE_3_DAYS]?.count} (
                ${((membershipsByType?.[MEMBERSHIP_TYPE_3_DAYS]?.count / length) * 100).toFixed(2)}%)`}
            </span>
          </div>
          <Progress value={(membershipsByType?.[MEMBERSHIP_TYPE_3_DAYS]?.count / length) * 100} />
        </div>
        <div key={MEMBERSHIP_TYPE_DAILY} className='space-y-2'>
          <div className='flex justify-between items-center'>
            <span className='text-xs sm:text-sm font-medium text-white/70'>
              {MembershipTranslation[MEMBERSHIP_TYPE_DAILY]}
            </span>
            <span className='text-xs sm:text-sm text-white/70'>
              {`${membershipsByType?.[MEMBERSHIP_TYPE_DAILY]?.count} (
                ${((membershipsByType?.[MEMBERSHIP_TYPE_DAILY]?.count / length) * 100).toFixed(2)}%)`}
            </span>
          </div>
          <Progress value={(membershipsByType?.[MEMBERSHIP_TYPE_DAILY]?.count / length) * 100} />
        </div>
        <div className='pt-2 border-t border-primary200'>
          <p className='text-xs sm:text-sm text-white/70'>
            Total: <span className='font-medium'>{length} membresías activas</span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export const ActiveTypesSkeleton = () => {
  return (
    <Card className='py-3 sm:py-6'>
      <CardHeader className='px-2 sm:px-6'>
        <CardTitle className='flex items-center gap-2 text-white/70 text-sm sm:text-base'>
          <Users className='h-5 w-5 text-primary' />
          Membresías por Tipo
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-3 px-2 sm:px-6'>
        {[...Array(3)].map((_, index) => (
          <div key={index} className='space-y-2'>
            <div className='flex justify-between items-center'>
              <span className='text-xs sm:text-sm font-medium text-white/70'>Cargando...</span>
              <Skeleton className='w-24 h-4' />
            </div>
            <Skeleton className='w-full h-2 rounded-full' />
          </div>
        ))}
        <div className='pt-2 border-t border-primary200'>
          <p className='text-xs sm:text-sm text-white/70'>Total: Cargando...</p>
        </div>
      </CardContent>
    </Card>
  )
}
