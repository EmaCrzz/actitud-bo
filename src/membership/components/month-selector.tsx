'use client'

import { useMonth } from '@/membership/context/month-context'
import MonthSelectorRow from '@/components/month-selector-row'

export default function MembershipMonthSelector() {
  const { year, month, isCurrentMonth } = useMonth()

  return (
    <MonthSelectorRow
      isCurrentMonth={isCurrentMonth}
      month={month}
      year={year}
      onNextMonth={() => {}}
      onPreviousMonth={() => {}}
    />
  )
}
