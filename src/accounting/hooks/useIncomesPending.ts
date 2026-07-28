import { useQuery } from '@tanstack/react-query'
import { getIncomesPending } from '@/accounting/api/client'

// Lazy: solo dispara el fetch cuando `enabled` es true (típicamente al abrir el modal).
export default function useIncomesPending(month: string, enabled: boolean) {
  return useQuery({
    queryKey: ['incomes-pending', month],
    queryFn: async () => {
      const response = await getIncomesPending(month)

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch pending customers')
      }

      return response.data
    },
    enabled,
    staleTime: 1000 * 60,
  })
}
