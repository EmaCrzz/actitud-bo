import { useQuery } from '@tanstack/react-query'
import { getMonthlyStats } from '@/accounting/api/client'

interface UseMonthlyStatsOptions {
  month?: string
}

export default function useMonthlyStats(options?: UseMonthlyStatsOptions) {
  return useQuery({
    queryKey: ['monthly-stats', options?.month],
    queryFn: async () => {
      const response = await getMonthlyStats(options?.month)

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch monthly statistics')
      }

      return response.data
    },
    staleTime: 1000 * 60, // 1 minute
  })
}
