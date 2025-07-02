import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'
import { getActiveMemberships, getDailyMembershipsThisMonth } from '@/membership/api/server'
import {
  MEMBERSHIP_TYPE_5_DAYS,
  MEMBERSHIP_TYPE_3_DAYS,
  MEMBERSHIP_TYPE_DAILY,
  MembershipTranslation,
} from '@/membership/consts'

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
  const { data: dataDaily = [] } = await getDailyMembershipsThisMonth()

  if (!data || error) return null

  const allData = [...data, ...dataDaily]
  const length = allData.length
  const membershipsByType = allData.reduce(
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
              {`${membershipsByType[MEMBERSHIP_TYPE_5_DAYS].count} (
                ${((membershipsByType[MEMBERSHIP_TYPE_5_DAYS].count / length) * 100).toFixed(2)}%)`}
            </span>
          </div>
          <Progress value={(membershipsByType[MEMBERSHIP_TYPE_5_DAYS].count / length) * 100} />
        </div>
        <div key={MEMBERSHIP_TYPE_3_DAYS} className='space-y-2'>
          <div className='flex justify-between items-center'>
            <span className='text-xs sm:text-sm font-medium text-white/70'>
              {MembershipTranslation[MEMBERSHIP_TYPE_3_DAYS]}
            </span>
            <span className='text-xs sm:text-sm text-white/70'>
              {`${membershipsByType[MEMBERSHIP_TYPE_3_DAYS].count} (
                ${((membershipsByType[MEMBERSHIP_TYPE_3_DAYS].count / length) * 100).toFixed(2)}%)`}
            </span>
          </div>
          <Progress value={(membershipsByType[MEMBERSHIP_TYPE_3_DAYS].count / length) * 100} />
        </div>
        <div key={MEMBERSHIP_TYPE_DAILY} className='space-y-2'>
          <div className='flex justify-between items-center'>
            <span className='text-xs sm:text-sm font-medium text-white/70'>
              {MembershipTranslation[MEMBERSHIP_TYPE_DAILY]}
            </span>
            <span className='text-xs sm:text-sm text-white/70'>
              {`${membershipsByType[MEMBERSHIP_TYPE_DAILY].count} (
                ${((membershipsByType[MEMBERSHIP_TYPE_DAILY].count / length) * 100).toFixed(2)}%)`}
            </span>
          </div>
          <Progress value={(membershipsByType[MEMBERSHIP_TYPE_DAILY].count / length) * 100} />
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
