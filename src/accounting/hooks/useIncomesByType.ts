import { useQuery } from '@tanstack/react-query'
import { getIncomesByType } from '@/accounting/api/client'

// Lazy: solo dispara el fetch cuando `enabled` es true (típicamente al abrir el modal).
export default function useIncomesByType(month: string, type: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['incomes-by-type', month, type],
    queryFn: async () => {
      if (!type) throw new Error('Missing type')
      const response = await getIncomesByType(month, type)

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch payments by type')
      }

      return response.data
    },
    enabled: enabled && !!type,
    staleTime: 1000 * 60,
  })
}
