import { useQuery } from '@tanstack/react-query'
import type { AccountingFilters } from '@/accounting/types'
import { getExpenses } from '../api'

interface UseExpensesOptions {
  month?: string
  category?: string
}

export function useExpenses(filters?: UseExpensesOptions) {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: async () => {
      const accountingFilters: AccountingFilters = {
        month: filters?.month,
        category: filters?.category,
      }

      const response = await getExpenses(accountingFilters)

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch expenses')
      }

      return response.data
    },
    staleTime: 1000 * 60, // 1 minutes
  })
}
