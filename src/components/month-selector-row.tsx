'use client'

import { Button } from '@/components/ui/button'
import { useTranslations } from '@/lib/i18n/context'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface MonthSelectorRowProps {
  onPreviousMonth: () => void
  onNextMonth: () => void
  isCurrentMonth: boolean
  month: number
  year: number
}

export default function MonthSelectorRow({
  onNextMonth,
  onPreviousMonth,
  isCurrentMonth,
  month,
  year,
}: MonthSelectorRowProps) {
  const { t } = useTranslations()
  const monthKeys = [
    'months.january',
    'months.february',
    'months.march',
    'months.april',
    'months.may',
    'months.june',
    'months.july',
    'months.august',
    'months.september',
    'months.october',
    'months.november',
    'months.december',
  ] as const

  return (
    <div className='flex items-center justify-between bg-transparent py-4 h-20'>
      <Button
        className='text-white hover:bg-gray-800'
        size='icon'
        variant='ghost'
        onClick={onPreviousMonth}
      >
        <ChevronLeft className='w-6 h-6' />
      </Button>

      <div className='text-center'>
        <h2 className='text-white text-xl font-semibold'>
          {t(monthKeys[month - 1])} {year}
        </h2>
        {isCurrentMonth && <p className='text-gray-400 text-sm'>{t('common.currentMonth')}</p>}
      </div>

      <Button
        className='text-white hover:bg-gray-800'
        disabled={isCurrentMonth}
        size='icon'
        variant='ghost'
        onClick={onNextMonth}
      >
        <ChevronRight className='w-6 h-6' />
      </Button>
    </div>
  )
}
