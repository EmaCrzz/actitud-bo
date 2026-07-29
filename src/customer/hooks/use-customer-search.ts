'use client'

import { useEffect, useMemo, useState } from 'react'
import { useDebounce } from 'use-debounce'

import { searchCustomer } from '@/customer/api/client'
import { Customer } from '@/customer/types'

interface UseCustomerSearchOptions {
  debounceMs?: number
  excludeIds?: Iterable<string>
}

interface UseCustomerSearchResult {
  query: string
  setQuery: (value: string) => void
  debouncedQuery: string
  results: Customer[]
  loading: boolean
}

export function useCustomerSearch({
  debounceMs = 400,
  excludeIds,
}: UseCustomerSearchOptions = {}): UseCustomerSearchResult {
  const [query, setQuery] = useState('')
  const [debouncedQuery] = useDebounce(query, debounceMs)
  const [results, setResults] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function run() {
      const trimmed = debouncedQuery.trim()

      if (!trimmed) {
        setResults([])

        return
      }
      setLoading(true)
      try {
        const found = await searchCustomer(trimmed)

        if (!cancelled) setResults(found ?? [])
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  const excludeSet = useMemo(() => (excludeIds ? new Set(excludeIds) : null), [excludeIds])

  const filteredResults = useMemo(
    () => (excludeSet ? results.filter((c) => !excludeSet.has(c.id)) : results),
    [results, excludeSet]
  )

  return {
    query,
    setQuery,
    debouncedQuery,
    results: filteredResults,
    loading,
  }
}
