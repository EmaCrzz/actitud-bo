'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getActiveMemberships, getPendingPaymentCustomers } from '@/membership/api/client'
import { type ActiveMembership } from '@/membership/types'
import { MEMBERSHIP_TYPE_VIP } from '@/membership/consts'

type PendingCustomer = {
  id: string
  first_name: string
  last_name: string
  person_id: string
  phone: string | null
  email: string | null
  assistance_count: number
  created_at: string
  customer_membership: {
    id: string
    membership_type: string
    last_payment_date: string | null
    expiration_date: string | null
    created_at: string
  } | null
}

const CUSTOMER_STATS_KEY = ['customer-stats']

// Hook para obtener clientes activos
export function useActiveCustomers() {
  return useQuery({
    queryKey: [...CUSTOMER_STATS_KEY, 'actives'],
    queryFn: async () => {
      const [activesResult, pendingsResult] = await Promise.all([
        getActiveMemberships(),
        getPendingPaymentCustomers(),
      ])

      if (activesResult.error) {
        throw new Error('Error loading active memberships')
      }
      if (pendingsResult.error) {
        throw new Error('Error loading pending customers')
      }

      const pendingCustomers = (pendingsResult.data as unknown as PendingCustomer[]) || []

      // Extraer VIPs de pendientes y convertirlos a ActiveMembership
      const vipFromPendings: ActiveMembership[] = pendingCustomers
        .filter((customer) => customer.customer_membership?.membership_type === MEMBERSHIP_TYPE_VIP)
        .map((customer) => ({
          id: customer.customer_membership!.id,
          membership_type: customer.customer_membership!.membership_type,
          last_payment_date: customer.customer_membership!.last_payment_date,
          expiration_date: customer.customer_membership!.expiration_date,
          created_at: customer.customer_membership!.created_at,
          customers: {
            id: customer.id,
            first_name: customer.first_name,
            last_name: customer.last_name,
            person_id: customer.person_id,
            phone: customer.phone,
            email: customer.email,
            assistance_count: customer.assistance_count,
            created_at: customer.created_at,
          },
          types_memberships: {
            type: customer.customer_membership!.membership_type,
          },
          last_payment: null,
        }))

      return [...(activesResult.data || []), ...vipFromPendings]
    },
  })
}

// Hook para obtener clientes pendientes
export function usePendingCustomers() {
  return useQuery({
    queryKey: [...CUSTOMER_STATS_KEY, 'pendings'],
    queryFn: async () => {
      const result = await getPendingPaymentCustomers()

      if (result.error) {
        throw new Error('Error loading pending customers')
      }

      const pendingCustomers = (result.data as unknown as PendingCustomer[]) || []

      // Filtrar VIPs de pendientes
      return pendingCustomers.filter(
        (customer) => customer.customer_membership?.membership_type !== MEMBERSHIP_TYPE_VIP
      )
    },
  })
}

// Hook para invalidar el caché después de mutaciones
export function useInvalidateCustomerStats() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // Esta función no hace nada, solo sirve para tener una mutation
      return Promise.resolve()
    },
    onSuccess: () => {
      // Invalidar todas las queries relacionadas con customer stats
      queryClient.invalidateQueries({ queryKey: CUSTOMER_STATS_KEY })
    },
  })
}
