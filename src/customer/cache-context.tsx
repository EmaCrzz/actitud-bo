'use client'

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import { getActiveMemberships } from '@/membership/api/client'
import { getPendingPaymentCustomers } from '@/membership/api/client'
import { type ActiveMembership } from '@/membership/types'
import { CustomerMembership } from './types'

type Customer = {
  id: string
  first_name: string
  last_name: string
  customer_membership: CustomerMembership | null
}

interface CustomerCacheData {
  actives: ActiveMembership[]
  pendings: Customer[]
  timestamp: number
}

interface CustomerCacheState {
  data: CustomerCacheData | null
  isLoading: boolean
  error: string | null
  hasInitialLoad: boolean
}

interface CustomerCacheContextType extends CustomerCacheState {
  revalidate: () => Promise<void>
}

const CustomerCacheContext = createContext<CustomerCacheContextType | null>(null)

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function CustomerCacheProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CustomerCacheState>({
    data: null,
    isLoading: true,
    error: null,
    hasInitialLoad: false,
  })

  const cacheRef = useRef<CustomerCacheData | null>(null)
  const loadingRef = useRef<Promise<void> | null>(null)

  const loadData = useCallback(async (forceRefresh = false) => {
    const now = Date.now()

    // Check if we have fresh cached data and don't need to force refresh
    if (!forceRefresh && cacheRef.current && (now - cacheRef.current.timestamp) < CACHE_DURATION) {
      setState(prev => ({
        ...prev,
        data: cacheRef.current,
        isLoading: false,
        error: null
      }))

      return
    }

    // If already loading, return the existing promise
    if (loadingRef.current) {
      return loadingRef.current
    }

    setState(prev => ({
      ...prev,
      isLoading: !prev.hasInitialLoad, // Only show loading on first load
      error: null
    }))

    const loadPromise = async () => {
      try {
        const [activesResult, pendingsResult] = await Promise.all([
          getActiveMemberships(),
          getPendingPaymentCustomers()
        ])

        if (activesResult.error) {
          throw new Error('Error loading active memberships')
        }
        if (pendingsResult.error) {
          throw new Error('Error loading pending customers')
        }

        const newData: CustomerCacheData = {
          actives: activesResult.data || [],
          pendings: pendingsResult.data as unknown as Customer[] || [],
          timestamp: now,
        }

        cacheRef.current = newData

        setState({
          data: newData,
          isLoading: false,
          error: null,
          hasInitialLoad: true,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error loading data'

        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          hasInitialLoad: true,
        }))
      } finally {
        loadingRef.current = null
      }
    }

    loadingRef.current = loadPromise()

    return loadingRef.current
  }, [])

  const revalidate = useCallback(() => {
    return loadData(true)
  }, [loadData])

  // Initial load
  useEffect(() => {
    if (!state.hasInitialLoad) {
      loadData()
    }
  }, [loadData, state.hasInitialLoad])

  const contextValue: CustomerCacheContextType = {
    ...state,
    revalidate,
  }

  return (
    <CustomerCacheContext.Provider value={contextValue}>
      {children}
    </CustomerCacheContext.Provider>
  )
}

export function useCustomerCache() {
  const context = useContext(CustomerCacheContext)

  if (!context) {
    throw new Error('useCustomerCache must be used within a CustomerCacheProvider')
  }

  return {
    actives: context.data?.actives || [],
    pendings: context.data?.pendings || [],
    isLoading: context.isLoading,
    error: context.error,
    hasData: context.data !== null,
    revalidate: context.revalidate,
  }
}