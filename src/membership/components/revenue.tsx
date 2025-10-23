'use client'

import PersonsIcon from '@/components/icons/persons'
import { useMonth } from '../context/month-context'
import { useTranslations } from '@/lib/i18n/context'

export default function MembershipRevenue({ colors }: { colors: Record<string, string> }) {
  const { loading, membershipData } = useMonth()
  const { t } = useTranslations()

  if (loading) return null

  return (
    <div className='space-y-6'>
      <div className='bg-input-background rounded border-[0.5px] border-[#DAD7D8] p-4'>
        <h3 className='text-primary400 text-xl font-semibold mb-4 border-b pb-1'>
          {t('accounting.income.byMemberships')}
        </h3>
        <div className='space-y-3'>
          {membershipData.memberships.map((item, index) => {
            return (
              <div key={index} className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div
                    className={'w-4 h-4 rounded-full'}
                    style={{ backgroundColor: colors[item.color] }}
                  />
                  <span className='text-white font-medium'>
                    {item.displayName ? t(item.displayName) : '-'}
                  </span>
                </div>
                <div className='flex items-center gap-2 text-white'>
                  <span className='font-bold text-lg'>{item.count}</span>
                  <PersonsIcon className='size-5 stroke-2' />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
