import type {
  GetExpensesResponse,
  CreateExpenseResponse,
  CreateExpenseData,
  UpdateExpenseData,
  AccountingFilters,
} from '@/accounting/types'

const API_BASE = '/api/accounting'

// Expenses
export const getExpenses = async (filters?: AccountingFilters): Promise<GetExpensesResponse> => {
  try {
    const params = new URLSearchParams()

    if (filters?.month) params.append('month', filters.month)
    if (filters?.category) params.append('category', filters.category)

    const url = `${API_BASE}/expenses${params.toString() ? `?${params.toString()}` : ''}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch expenses',
    }
  }
}

export const createExpense = async (
  expenseData: CreateExpenseData
): Promise<CreateExpenseResponse> => {
  try {
    const response = await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(expenseData),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    return {
      data: null,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create expense',
    }
  }
}

export const updateExpense = async (
  expenseData: UpdateExpenseData
): Promise<CreateExpenseResponse> => {
  try {
    const response = await fetch(`${API_BASE}/expenses/${expenseData.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(expenseData),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    return {
      data: null,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update expense',
    }
  }
}

export const deleteExpense = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete expense',
    }
  }
}
