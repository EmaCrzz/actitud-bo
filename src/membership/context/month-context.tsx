'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { getMembershipStats } from '../api/client'
import { getAppTzDateParts } from '@/lib/timezone'
import {
  MembershipTranslation,
  PENDING_PAYMENT,
  MEMBERSHIP_TYPE_5_DAYS,
  MEMBERSHIP_TYPE_3_DAYS,
  MEMBERSHIP_TYPE_DAILY,
  MEMBERSHIP_TYPE_VIP,
} from '../consts'
import { TranslationKey } from '@/lib/i18n/types'

type MonthContextType = {
  year: number
  month: number
  setYear: (year: number) => void
  setMonth: (month: number) => void
  goToPreviousMonth: () => void
  goToNextMonth: () => void
  isCurrentMonth: boolean
  loading: boolean
  membershipData: MembershipData
}

const MonthContext = createContext<MonthContextType | undefined>(undefined)

export type MembershipSegment = {
  type: string
  count: number
  color: string
  displayName?: TranslationKey
}

export type MembershipData = {
  total: number
  memberships: MembershipSegment[]
}

export function MonthProvider({ children }: { children: ReactNode }) {
  // Mes/año en AR — usar TZ local del server/browser corría el "mes actual"
  // al mes siguiente cada vez que en AR era > 21hs de un fin de mes.
  const { year: currentYear, month: currentMonth } = getAppTzDateParts()

  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(currentMonth)
  const [loading, setLoading] = useState(true)
  const [membershipData, setMembershipData] = useState<MembershipData>({
    total: 0,
    memberships: [],
  })

  const goToPreviousMonth = () => {
    if (month === 1) {
      setMonth(12)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
  }

  const goToNextMonth = () => {
    if (month === 12) {
      setMonth(1)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
  }

  const isCurrentMonth = year === currentYear && month === currentMonth

  useEffect(() => {
    const fetchMembershipStats = async () => {
      setLoading(true)
      try {
        const { data, error } = await getMembershipStats(year, month)

        if (data && !error) {
          // Orden deseado de membresías
          const membershipOrder = [
            MEMBERSHIP_TYPE_5_DAYS,
            MEMBERSHIP_TYPE_3_DAYS,
            MEMBERSHIP_TYPE_DAILY,
            MEMBERSHIP_TYPE_VIP,
            PENDING_PAYMENT,
          ]

          // Filtrar solo los segmentos con count > 0 y transformar los datos
          const filteredMemberships = data.memberships
            .filter((membership: MembershipSegment) => membership.count > 0)
            .map((membership: MembershipSegment) => {
              const displayName =
                membership.type === PENDING_PAYMENT
                  ? 'payments.pending'
                  : MembershipTranslation[membership.type as keyof typeof MembershipTranslation] ||
                    membership.type

              return {
                ...membership,
                displayName,
              }
            })
            .sort((a, b) => {
              const indexA = membershipOrder.indexOf(a.type as (typeof membershipOrder)[number])
              const indexB = membershipOrder.indexOf(b.type as (typeof membershipOrder)[number])

              return indexA - indexB
            })

          setMembershipData({
            total: data.total,
            memberships: filteredMemberships,
          })
        }
      } catch (error) {
        console.error('Error fetching membership stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMembershipStats()
  }, [year, month])

  return (
    <MonthContext.Provider
      value={{
        year,
        month,
        setYear,
        setMonth,
        goToPreviousMonth,
        goToNextMonth,
        isCurrentMonth,
        loading,
        membershipData,
      }}
    >
      {children}
    </MonthContext.Provider>
  )
}

export function useMonth() {
  const context = useContext(MonthContext)

  if (context === undefined) {
    throw new Error('useMonth must be used within a MonthProvider')
  }

  return context
}
