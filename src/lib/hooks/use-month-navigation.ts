'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getCurrentMonth } from '@/lib/format-date'
import { getAppTzDateParts } from '@/lib/timezone'

export function useMonthNavigation() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const monthParam = searchParams.get('month')

  // Si no hay parámetro, usar mes actual
  const initialMonth = monthParam || getCurrentMonth()
  const [currentYear, currentMonthNum] = initialMonth.split('-').map(Number)

  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(currentMonthNum)

  // Sincronizar estado con query params cuando cambian
  useEffect(() => {
    const monthFromUrl = monthParam || getCurrentMonth()
    const [urlYear, urlMonth] = monthFromUrl.split('-').map(Number)

    setYear(urlYear)
    setMonth(urlMonth)
  }, [monthParam])

  // Comparar contra mes/año en AR — usar TZ del server hacía que a partir de
  // las 21hs AR de un fin de mes, `isCurrentMonth` fuera false y el home
  // mostrara datos del mes siguiente.
  const { year: nowYear, month: nowMonth } = getAppTzDateParts()
  const isCurrentMonth = year === nowYear && month === nowMonth

  const updateUrlMonth = (newYear: number, newMonth: number) => {
    const monthStr = `${newYear}-${String(newMonth).padStart(2, '0')}`
    const params = new URLSearchParams(searchParams.toString())

    params.set('month', monthStr)
    router.push(`${pathname}?${params.toString()}`)
  }

  const goToPreviousMonth = () => {
    let newMonth = month - 1
    let newYear = year

    if (newMonth < 1) {
      newMonth = 12
      newYear = year - 1
    }

    updateUrlMonth(newYear, newMonth)
  }

  const goToNextMonth = () => {
    let newMonth = month + 1
    let newYear = year

    if (newMonth > 12) {
      newMonth = 1
      newYear = year + 1
    }

    updateUrlMonth(newYear, newMonth)
  }

  const currentMonthFormatted = `${year}-${String(month).padStart(2, '0')}`

  return {
    year,
    month,
    isCurrentMonth,
    currentMonthFormatted,
    goToPreviousMonth,
    goToNextMonth,
  }
}
