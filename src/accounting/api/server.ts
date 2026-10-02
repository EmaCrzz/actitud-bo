import { createClient } from '@/lib/supabase/server'
import { getMonthRangeFromKey, parseAppTzDateString } from '@/lib/timezone'
import { toAppTzQueryBounds } from '@/lib/date-range-params'
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
//
// Lista y filtra por `payment_date` — criterio de caja: el mes de un pago es el
// mes en que entró la plata. El período que cubre la cuota vive en
// `period_start` desde el issue #59, y este listado no lo usa a propósito: es
// la vista contable de los cobros, no del ciclo de cobranza.
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
      customer:customers(first_name, last_name),
      plan:types_memberships(name, weekly_quota)
    `
    )
    .order('payment_date', { ascending: false })

  if (filters?.month) {
    const { start, end } = getMonthRangeFromKey(filters.month)

    query = query.gte('payment_date', start.toISOString()).lt('payment_date', end.toISOString())
  }

  // Rango de días AR (Fase 12, Ventas). Mismo criterio de caja que `month`:
  // el día de un pago es el día en que entró la plata.
  const bounds = toAppTzQueryBounds({ from: filters?.from, to: filters?.to })

  if (bounds.gte) query = query.gte('payment_date', bounds.gte)
  if (bounds.lt) query = query.lt('payment_date', bounds.lt)

  if (filters?.customer_id) {
    query = query.eq('customer_id', filters.customer_id)
  }

  if (filters?.payment_method) {
    query = query.eq('payment_method', filters.payment_method)
  }

  // Tira en vez de devolver `[]`: una lectura caída no puede verse igual que
  // un período sin cobros. Ver el comentario gemelo en `getExpenses`.
  const { data, error } = await query

  if (error) throw new Error(error.message)

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

  // Rango explícito (Fase 11), canonicalizado a días AR. Ver
  // `toAppTzQueryBounds`: los strings del datepicker crudos arrancarían y
  // terminarían el rango tres horas antes de lo que dice la pantalla.
  const bounds = toAppTzQueryBounds({ from: filters?.from, to: filters?.to })

  if (bounds.gte) query = query.gte('expense_date', bounds.gte)
  if (bounds.lt) query = query.lt('expense_date', bounds.lt)

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  // El medio de pago y la búsqueda **no se filtran acá**, aunque se podría:
  // la sección los aplica en memoria para que los KPIs puedan describir el
  // período completo mientras la tabla muestra el subconjunto. Resolverlos
  // también en el server dejaría dos caminos para la misma pregunta.

  // **Tira si la lectura falla** (desde la Fase 12). Antes devolvía `[]`, así
  // que el cartel de error de la sección Gastos —que asume que esto tira— no
  // aparecía nunca: una caída se veía como "Aún no se registraron gastos".
  // Los dos llamadores, la ruta HTTP y la página v2, ya atrapan la excepción.
  const { data, error } = await query

  if (error) throw new Error(error.message)

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
  // ambos totales coincidan. Ingresos por `payment_date` (cuándo entró la
  // plata) contra gastos por `expense_date`: los dos lados del balance miden
  // caja, que es lo que los hace comparables. Ver el issue #59.
  const { start, end } = getMonthRangeFromKey(month)
  const startIso = start.toISOString()
  const endIso = end.toISOString()

  // Ejecutar ambas consultas en paralelo para evitar waterfalls
  //
  // Desde la Fase 13 el ingreso suma también las **ventas de producto**
  // (`sales`): es el mismo "Ingresos" del Balance de v2, y sin ellas este
  // balance de v1 se quedaría corto en cuanto alguien venda una remera.
  // `payments_count` sigue contando sólo cuotas, que es lo que dice.
  const [{ data: payments }, { data: sales }, { data: expenses }] = await Promise.all([
    supabase
      .from('membership_payments')
      .select('amount, payment_date')
      .gte('payment_date', startIso)
      .lt('payment_date', endIso),
    supabase.from('sales').select('amount').gte('sale_date', startIso).lt('sale_date', endIso),
    supabase
      .from('expenses')
      .select('amount, expense_date')
      .gte('expense_date', startIso)
      .lt('expense_date', endIso),
  ])

  // Consultamos un solo mes: agregamos todo bajo `month` (la key AR)
  // en vez de derivar la key del ISO UTC de cada fila, que puede caer
  // en el mes siguiente para pagos hechos después de las 21:00 AR.
  const sumAmounts = (rows: { amount: number | null }[] | null) =>
    (rows ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0)
  const total_income = sumAmounts(payments) + sumAmounts(sales)
  const total_expenses = sumAmounts(expenses)

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
