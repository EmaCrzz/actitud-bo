import { createClient } from '@/lib/supabase/server'
import { getMonthRangeFromKey, parseAppTzDateString } from '@/lib/timezone'
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

// Canonicaliza `expense_date` a midnight AR. El form envía la fecha del
// datepicker como string "YYYY-MM-DD"; sin canonicalización Postgres la
// interpreta como midnight UTC (= día anterior 21hs AR) y el gasto queda
// asignado al mes calendario AR anterior al esperado. Ver ADR
// `20260709153000_representacion-canonica-de-fechas-ar.md` (sec. Reincidencia).
function withCanonicalExpenseDate<T extends { expense_date?: string }>(input: T): T {
  if (!input.expense_date) return input
  const datePart = input.expense_date.slice(0, 10)

  return { ...input, expense_date: parseAppTzDateString(datePart).toISOString() }
}

// Membership Payments
export const getMembershipPayments = async (
  filters?: AccountingFilters
): Promise<MembershipPayment[]> => {
  const supabase = await createClient()

  // Verify admin role
  const { requireAdmin } = await import('@/auth/api/server')

  await requireAdmin()

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
    const { start, end } = getMonthRangeFromKey(filters.month)

    query = query.gte('payment_date', start.toISOString()).lt('payment_date', end.toISOString())
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

  // Verify admin role
  const { requireAdmin } = await import('@/auth/api/server')

  await requireAdmin()

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

  // Verify admin role
  const { requireAdmin } = await import('@/auth/api/server')

  await requireAdmin()

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

  // Verify admin role
  const { requireAdmin } = await import('@/auth/api/server')

  await requireAdmin()

  const { error } = await supabase.from('membership_payments').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

// Expenses
export const getExpenses = async (filters?: AccountingFilters): Promise<Expense[]> => {
  const supabase = await createClient()

  // Verify admin role
  const { requireAdmin } = await import('@/auth/api/server')

  await requireAdmin()

  let query = supabase.from('expenses').select('*').order('expense_date', { ascending: false })

  if (filters?.month) {
    const { start, end } = getMonthRangeFromKey(filters.month)

    query = query.gte('expense_date', start.toISOString()).lt('expense_date', end.toISOString())
  }

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  const { data } = await query

  return data || []
}

export const getExpenseById = async (id: string): Promise<Expense | null> => {
  const supabase = await createClient()

  // Verify admin role
  const { requireAdmin } = await import('@/auth/api/server')

  await requireAdmin()

  const { data } = await supabase.from('expenses').select('*').eq('id', id).maybeSingle()

  return data
}

export const createExpense = async (expenseData: CreateExpenseData): Promise<Expense | null> => {
  const supabase = await createClient()

  // Verify admin role
  const { requireAdmin } = await import('@/auth/api/server')

  await requireAdmin()

  const canonicalized = withCanonicalExpenseDate(expenseData)
  const { data, error } = await supabase
    .from('expenses')
    .insert([canonicalized])
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const updateExpense = async (expenseData: UpdateExpenseData): Promise<Expense | null> => {
  const supabase = await createClient()

  // Verify admin role
  const { requireAdmin } = await import('@/auth/api/server')

  await requireAdmin()

  const { id, ...updateData } = withCanonicalExpenseDate(expenseData)

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

  // Verify admin role
  const { requireAdmin } = await import('@/auth/api/server')

  await requireAdmin()

  const { error } = await supabase.from('expenses').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

// Monthly Statistics
export const getMonthlyStats = async (month: string): Promise<MonthlyStats[]> => {
  const supabase = await createClient()

  // Verify admin role
  const { requireAdmin } = await import('@/auth/api/server')

  await requireAdmin()

  // Rango [start, end) del mes en AR — mismo criterio que /incomes para que
  // ambos totales coincidan.
  const { start, end } = getMonthRangeFromKey(month)
  const startIso = start.toISOString()
  const endIso = end.toISOString()

  // Ejecutar ambas consultas en paralelo para evitar waterfalls
  const [{ data: payments }, { data: expenses }] = await Promise.all([
    supabase
      .from('membership_payments')
      .select('amount, payment_date')
      .gte('payment_date', startIso)
      .lt('payment_date', endIso),
    supabase
      .from('expenses')
      .select('amount, expense_date')
      .gte('expense_date', startIso)
      .lt('expense_date', endIso),
  ])

  // Consultamos un solo mes: agregamos todo bajo `month` (la key AR)
  // en vez de derivar la key del ISO UTC de cada fila, que puede caer
  // en el mes siguiente para pagos hechos después de las 21:00 AR.
  const total_income = (payments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0)
  const total_expenses = (expenses ?? []).reduce((sum, e) => sum + (e.amount ?? 0), 0)

  return [
    {
      month,
      total_income,
      total_expenses,
      net_result: total_income - total_expenses,
      payments_count: payments?.length ?? 0,
      expenses_count: expenses?.length ?? 0,
    },
  ]
}
