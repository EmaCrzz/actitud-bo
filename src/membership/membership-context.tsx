'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MembershipType } from '@/membership/types'

interface MembershipContextValue {
  memberships: MembershipType[]
  isLoading: boolean
  refetch: () => Promise<void>
}

const MembershipContext = createContext<MembershipContextValue | undefined>(undefined)

async function getMemberships(): Promise<MembershipType[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('types_memberships')
    .select('id, type, amount, amount_surcharge, middle_amount, last_update')
    .order('type', { ascending: true })

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching memberships:', error)

    return []
  }

  return (data as MembershipType[]) || []
}

interface MembershipProviderProps {
  children: ReactNode
}

export function MembershipProvider({ children }: MembershipProviderProps) {
  const [memberships, setMemberships] = useState<MembershipType[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchMemberships = async () => {
    setIsLoading(true)
    const data = await getMemberships()

    setMemberships(data)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchMemberships()
  }, [])

  const value: MembershipContextValue = {
    memberships,
    isLoading,
    refetch: fetchMemberships,
  }

  return <MembershipContext.Provider value={value}>{children}</MembershipContext.Provider>
}

export function useMemberships() {
  const context = useContext(MembershipContext)

  if (context === undefined) {
    throw new Error('useMemberships must be used within a MembershipProvider')
  }

  return context
}
