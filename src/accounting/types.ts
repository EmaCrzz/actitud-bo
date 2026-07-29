// Accounting domain types
export interface MembershipPayment {
  id: string
  customer_id: string
  membership_type: string
  amount: number
  gross_amount: number
  discount_amount: number
  discount_rule_id: string | null
  discount_note: string | null
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

// --- Incomes dashboard ---

export interface IncomesCobrado {
  total: number
  payments_count: number
  average: number
  // null cuando no hay datos del mes anterior para comparar (ej: primer mes con actividad)
  delta_vs_previous_pct: number | null
}

export interface BillingCycleProgress {
  denominator: number
  paid_count: number
  paid_without_surcharge: number
  paid_with_surcharge: number
  pending_count: number
  // Día del mes en curso (1–31) según TZ del negocio, o null si el mes consultado no es el actual
  current_day_of_month: number | null
}

export interface IncomesByMembershipType {
  membership_type: string
  total: number
  count: number
}

export interface IncomesByPaymentMethod {
  payment_method: string
  total: number
  count: number
}

export interface DiscountRuleBreakdown {
  rule_name: string | null
  count: number
}

export interface IncomesDiscounts {
  total: number
  count: number
  by_rule: DiscountRuleBreakdown[]
}

export interface RecentPayment {
  id: string
  customer_id: string
  first_name: string
  last_name: string
  amount: number
  gross_amount: number
  discount_amount: number
  discount_rule_name: string | null
  payment_date: string
  payment_method: string
  membership_type: string
}

export interface MonthlyIncomePoint {
  month: string // YYYY-MM
  total: number
}

export interface IncomesSummary {
  month: string // YYYY-MM
  cobrado: IncomesCobrado
  cycle: BillingCycleProgress
  by_membership_type: IncomesByMembershipType[]
  by_payment_method: IncomesByPaymentMethod[]
  discounts: IncomesDiscounts
  recent_payments: RecentPayment[]
  last_6_months: MonthlyIncomePoint[]
}

export interface GetIncomesSummaryResponse {
  data: IncomesSummary | null
  success: boolean
  error?: string
}

// --- Drill-down: pendientes del mes ---

export interface PendingCustomer {
  customer_id: string
  first_name: string
  last_name: string
  membership_type: string
  expiration_date: string
  last_payment_date: string | null
}

export interface GetPendingCustomersResponse {
  data: PendingCustomer[] | null
  success: boolean
  error?: string
}

// --- Drill-down: pagos del mes por tipo, agrupados por cliente ---

export interface PaymentInGroup {
  id: string
  payment_date: string
  amount: number
  payment_method: string
}

export interface CustomerPaymentsGroup {
  customer_id: string
  first_name: string
  last_name: string
  payments: PaymentInGroup[]
  total_amount: number
}

export interface GetPaymentsByTypeResponse {
  data: CustomerPaymentsGroup[] | null
  success: boolean
  error?: string
}
