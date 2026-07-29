import { useQuery } from '@tanstack/react-query'
import { getIncomesSummary } from '@/accounting/api/client'

export default function useIncomesSummary(month?: string) {
  return useQuery({
    queryKey: ['incomes-summary', month],
    queryFn: async () => {
      const response = await getIncomesSummary(month)

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch incomes summary')
      }

      return response.data
    },
    staleTime: 1000 * 60,
  })
}
