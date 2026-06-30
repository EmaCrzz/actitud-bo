'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getCurrentMonth } from '@/lib/format-date'

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

  const currentDate = new Date()
  const isCurrentMonth = year === currentDate.getFullYear() && month === currentDate.getMonth() + 1

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
