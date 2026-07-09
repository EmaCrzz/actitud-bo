'use client'

import { Button } from '@/components/ui/button'
import { useTranslations } from '@/lib/i18n/context'
import { formatLongDayInAppTz } from '@/lib/format-date'
import { shiftIsoDateInAppTz } from '@/lib/timezone'
import { type Language } from '@/lib/i18n/types'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface DayNavigatorProps {
  currentDate: string
  todayDate: string
  minDate: string
  lang: Language
  basePath: string
}

export default function DayNavigator({
  currentDate,
  todayDate,
  minDate,
  lang,
  basePath,
}: DayNavigatorProps) {
  const router = useRouter()
  const { t } = useTranslations()

  const isToday = currentDate === todayDate
  const isAtMin = currentDate === minDate
  const yesterdayIso = shiftIsoDateInAppTz(todayDate, -1)
  const locale = lang === 'en' ? 'en-US' : 'es-AR'

  const label = (() => {
    if (isToday) return t('assistance.dayNavigator.today')
    if (currentDate === yesterdayIso) return t('assistance.dayNavigator.yesterday')

    return formatLongDayInAppTz(currentDate, locale)
  })()

  const goPrev = () => {
    const prev = shiftIsoDateInAppTz(currentDate, -1)

    router.push(`${basePath}?date=${prev}`)
  }

  const goNext = () => {
    const next = shiftIsoDateInAppTz(currentDate, 1)

    if (next === todayDate) router.push(basePath)
    else router.push(`${basePath}?date=${next}`)
  }

  return (
    <div
      aria-label={t('assistance.dayNavigator.ariaLabel')}
      className='flex items-center justify-between gap-2 py-3'
      role='group'
    >
      <Button
        aria-label={t('assistance.dayNavigator.previousDay')}
        className='size-9 rounded-full disabled:opacity-30'
        disabled={isAtMin}
        size='icon'
        type='button'
        variant='ghost'
        onClick={goPrev}
      >
        <ChevronLeft className='size-5' />
      </Button>
      <span
        aria-live='polite'
        className='text-sm sm:text-base font-medium capitalize text-white/80 text-center flex-1'
      >
        {label}
      </span>
      <Button
        aria-label={t('assistance.dayNavigator.nextDay')}
        className='size-9 rounded-full disabled:opacity-30'
        disabled={isToday}
        size='icon'
        type='button'
        variant='ghost'
        onClick={goNext}
      >
        <ChevronRight className='size-5' />
      </Button>
    </div>
  )
}
