// Accounting domain types
export interface MembershipPayment {
  id: string
  customer_id: string
  membership_type: string
  amount: number
  payment_date: string
  payment_method: string
  notes?: string
  created_at: string
  // Relations
  customer?: {
    first_name: string
    last_name: string
  }
}

export interface Expense {
  id: string
  description: string
  amount: number
  category: string
  expense_date: string
  notes?: string
  created_at: string
}

export interface CreateMembershipPaymentData {
  customer_id: string
  membership_type: string
  amount: number
  payment_date?: string
  payment_method?: string
  notes?: string
}

export interface CreateExpenseData {
  description: string
  amount: number
  category: string
  expense_date?: string
  notes?: string
}

export interface UpdateMembershipPaymentData extends Partial<CreateMembershipPaymentData> {
  id: string
}

export interface UpdateExpenseData extends Partial<CreateExpenseData> {
  id: string
}

export interface MonthlyStats {
  month: string // YYYY-MM format
  total_income: number
  total_expenses: number
  net_result: number
  payments_count: number
  expenses_count: number
}

export interface AccountingFilters {
  month?: string
  customer_id?: string
  category?: string
  payment_method?: string
}

// API Response types
export interface GetMembershipPaymentsResponse {
  data: MembershipPayment[]
  success: boolean
  error?: string
}

export interface GetExpensesResponse {
  data: Expense[]
  success: boolean
  error?: string
}

export interface GetMonthlyStatsResponse {
  data: MonthlyStats[]
  success: boolean
  error?: string
}

export interface CreateMembershipPaymentResponse {
  data: MembershipPayment | null
  success: boolean
  error?: string
}

export interface CreateExpenseResponse {
  data: Expense | null
  success: boolean
  error?: string
}
