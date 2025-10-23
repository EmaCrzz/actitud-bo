import { createClient } from '@/lib/supabase/server'
import type {
  MembershipPayment,
  Expense,
  CreateMembershipPaymentData,
  CreateExpenseData,
  UpdateMembershipPaymentData,
  UpdateExpenseData,
  MonthlyStats,
  AccountingFilters,
} from '@/accounting/types'

// Membership Payments
export const getMembershipPayments = async (
  filters?: AccountingFilters
): Promise<MembershipPayment[]> => {
  const supabase = await createClient()

  let query = supabase
    .from('membership_payments')
    .select(
      `
      *,
      customer:customers(first_name, last_name)
    `
    )
    .order('payment_date', { ascending: false })

  if (filters?.month) {
    const startDate = `${filters.month}-01`
    const endDate = `${filters.month}-31`

    query = query.gte('payment_date', startDate).lte('payment_date', endDate)
  }

  if (filters?.customer_id) {
    query = query.eq('customer_id', filters.customer_id)
  }

  if (filters?.payment_method) {
    query = query.eq('payment_method', filters.payment_method)
  }

  const { data } = await query

  return data || []
}

export const createMembershipPayment = async (
  paymentData: CreateMembershipPaymentData
): Promise<MembershipPayment | null> => {
  const supabase = await createClient()

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('membership_payments')
    .insert([paymentData])
    .select(
      `
      *,
      customer:customers(first_name, last_name)
    `
    )
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const updateMembershipPayment = async (
  paymentData: UpdateMembershipPaymentData
): Promise<MembershipPayment | null> => {
  const supabase = await createClient()

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('User not authenticated')
  }

  const { id, ...updateData } = paymentData

  const { data, error } = await supabase
    .from('membership_payments')
    .update(updateData)
    .eq('id', id)
    .select(
      `
      *,
      customer:customers(first_name, last_name)
    `
    )
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const deleteMembershipPayment = async (id: string): Promise<boolean> => {
  const supabase = await createClient()

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('User not authenticated')
  }

  const { error } = await supabase.from('membership_payments').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

// Expenses
export const getExpenses = async (filters?: AccountingFilters): Promise<Expense[]> => {
  const supabase = await createClient()

  let query = supabase.from('expenses').select('*').order('expense_date', { ascending: false })

  if (filters?.month) {
    const startDate = `${filters.month}-01`
    const endDate = `${filters.month}-31`

    query = query.gte('expense_date', startDate).lte('expense_date', endDate)
  }

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  const { data } = await query

  return data || []
}

export const createExpense = async (expenseData: CreateExpenseData): Promise<Expense | null> => {
  const supabase = await createClient()

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase.from('expenses').insert([expenseData]).select('*').single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const updateExpense = async (expenseData: UpdateExpenseData): Promise<Expense | null> => {
  const supabase = await createClient()

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('User not authenticated')
  }

  const { id, ...updateData } = expenseData

  const { data, error } = await supabase
    .from('expenses')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const deleteExpense = async (id: string): Promise<boolean> => {
  const supabase = await createClient()

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('User not authenticated')
  }

  const { error } = await supabase.from('expenses').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

// Monthly Statistics
export const getMonthlyStats = async (month: string): Promise<MonthlyStats[]> => {
  const supabase = await createClient()

  // Filter by specific month (format: YYYY-MM)
  const startDate = `${month}-01`
  const endDate = `${month}-31`

  const { data: payments } = await supabase
    .from('membership_payments')
    .select('amount, payment_date')
    .gte('payment_date', startDate)
    .lte('payment_date', endDate)

  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, expense_date')
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)

  // Group by month
  const monthlyData: Record<string, MonthlyStats> = {}

  // Process payments
  payments?.forEach((payment) => {
    const monthKey = payment.payment_date.substring(0, 7) // YYYY-MM

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthKey,
        total_income: 0,
        total_expenses: 0,
        net_result: 0,
        payments_count: 0,
        expenses_count: 0,
      }
    }
    monthlyData[monthKey].total_income += payment.amount
    monthlyData[monthKey].payments_count += 1
  })

  // Process expenses
  expenses?.forEach((expense) => {
    const monthKey = expense.expense_date.substring(0, 7) // YYYY-MM

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthKey,
        total_income: 0,
        total_expenses: 0,
        net_result: 0,
        payments_count: 0,
        expenses_count: 0,
      }
    }
    monthlyData[monthKey].total_expenses += expense.amount
    monthlyData[monthKey].expenses_count += 1
  })

  // Calculate net results and sort
  const result = Object.values(monthlyData)
    .map((stats) => ({
      ...stats,
      net_result: stats.total_income - stats.total_expenses,
    }))
    .sort((a, b) => b.month.localeCompare(a.month))

  return result
}
