import type {
  GetMembershipPaymentsResponse,
  GetMonthlyStatsResponse,
  CreateMembershipPaymentResponse,
  CreateMembershipPaymentData,
  UpdateMembershipPaymentData,
  AccountingFilters,
} from '@/accounting/types'

const API_BASE = '/api/accounting'

// Membership Payments
export const getMembershipPayments = async (
  filters?: AccountingFilters
): Promise<GetMembershipPaymentsResponse> => {
  try {
    const params = new URLSearchParams()

    if (filters?.month) params.append('month', filters.month)
    if (filters?.customer_id) params.append('customer_id', filters.customer_id)
    if (filters?.payment_method) params.append('payment_method', filters.payment_method)

    const url = `${API_BASE}/payments${params.toString() ? `?${params.toString()}` : ''}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch membership payments',
    }
  }
}

export const createMembershipPayment = async (
  paymentData: CreateMembershipPaymentData
): Promise<CreateMembershipPaymentResponse> => {
  try {
    const response = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    return {
      data: null,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create membership payment',
    }
  }
}

export const updateMembershipPayment = async (
  paymentData: UpdateMembershipPaymentData
): Promise<CreateMembershipPaymentResponse> => {
  try {
    const response = await fetch(`${API_BASE}/payments/${paymentData.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    return {
      data: null,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update membership payment',
    }
  }
}

export const deleteMembershipPayment = async (
  id: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE}/payments/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete membership payment',
    }
  }
}

// Monthly Statistics
export const getMonthlyStats = async (month?: string): Promise<GetMonthlyStatsResponse> => {
  try {
    const params = new URLSearchParams()
    if (month) params.append('month', month)

    const url = `${API_BASE}/stats${params.toString() ? `?${params.toString()}` : ''}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch monthly statistics',
    }
  }
}
