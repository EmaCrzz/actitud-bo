import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/auth/api/server'
import {
  getAppTzDateParts,
  getMonthRangeFromKey,
  parseAppTzDateString,
  utcInstantAtAppTzWallClock,
} from '@/lib/timezone'
import { MEMBERSHIP_TYPE_DAILY, MEMBERSHIP_TYPE_VIP } from '@/membership/consts'
import { ACTITUD_BILLING_POLICY } from '@/accounting/billing-policy'
import type {
  BillingCycleProgress,
  CustomerPaymentsGroup,
  DiscountRuleBreakdown,
  IncomesByMembershipType,
  IncomesByPaymentMethod,
  IncomesCobrado,
  IncomesDiscounts,
  IncomesSummary,
  MonthlyIncomePoint,
  PaymentInGroup,
  PendingCustomer,
  RecentPayment,
} from '@/accounting/types'

// Membresías excluidas del ciclo de cobro mensual: VIP no cobra periódicamente,
// DAILY es un pase de un día que no genera deuda al no renovar.
const CYCLE_EXCLUDED_MEMBERSHIP_TYPES = [MEMBERSHIP_TYPE_VIP, MEMBERSHIP_TYPE_DAILY]

// Devuelve el "YYYY-MM" del mes anterior a `monthKey`.
function getPreviousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  const prevYear = month === 1 ? year - 1 : year
  const prevMonth = month === 1 ? 12 : month - 1

  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`
}

// Trae la suma y cantidad de pagos en el rango del mes.
async function fetchMonthTotal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  monthKey: string
): Promise<{ total: number; count: number }> {
  const { start, end } = getMonthRangeFromKey(monthKey)
  const { data } = await supabase
    .from('membership_payments')
    .select('amount')
    .gte('payment_date', start.toISOString())
    .lt('payment_date', end.toISOString())

  if (!data) return { total: 0, count: 0 }

  const total = data.reduce((sum, p) => sum + (p.amount ?? 0), 0)

  return { total, count: data.length }
}

// Cobrado del mes + delta vs mes previo.
async function getIncomesCobrado(
  supabase: Awaited<ReturnType<typeof createClient>>,
  monthKey: string
): Promise<IncomesCobrado> {
  const [current, previous] = await Promise.all([
    fetchMonthTotal(supabase, monthKey),
    fetchMonthTotal(supabase, getPreviousMonthKey(monthKey)),
  ])

  const average = current.count > 0 ? current.total / current.count : 0
  const delta =
    previous.total > 0 ? ((current.total - previous.total) / previous.total) * 100 : null

  return {
    total: current.total,
    payments_count: current.count,
    average,
    delta_vs_previous_pct: delta,
  }
}

// Devuelve el conjunto de customer_ids de `candidates` que tienen al menos una
// asistencia en el rango. Usado como "señal de vida" para excluir churn
// silencioso del ciclo de cobros (socios cuya membresía sigue vigente por
// fecha pero que dejaron de asistir).
async function filterByAssistanceInRange(
  supabase: Awaited<ReturnType<typeof createClient>>,
  candidates: string[],
  start: Date,
  end: Date
): Promise<Set<string>> {
  if (candidates.length === 0) return new Set()

  const { data } = await supabase
    .from('assistance')
    .select('customer_id')
    .gte('assistance_date', start.toISOString())
    .lt('assistance_date', end.toISOString())
    .in('customer_id', candidates)

  return new Set((data ?? []).map((a) => a.customer_id))
}

// Progreso del ciclo de cobros del mes: cuántos socios activos con actividad
// real en el mes ya pagaron y en qué fase. El denominador exige "señal de
// vida" (al menos una asistencia en el mes) para excluir churn silencioso —
// socios cuya membresía sigue vigente por fecha pero que ya no vienen.
async function getBillingCycleProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  monthKey: string
): Promise<BillingCycleProgress> {
  const { start, end } = getMonthRangeFromKey(monthKey)

  // Candidatos: socios con membresía renovable activa que cubre parte del mes.
  // Se excluye VIP (no cobra periódicamente) y DAILY (pase único, no renueva).
  const { data: activeMembers } = await supabase
    .from('customer_membership')
    .select('customer_id, membership_type')
    .gte('expiration_date', start.toISOString())
    .not('membership_type', 'in', `(${CYCLE_EXCLUDED_MEMBERSHIP_TYPES.join(',')})`)

  const candidateIds = (activeMembers ?? []).map((m) => m.customer_id)
  const activeCustomerIds = await filterByAssistanceInRange(supabase, candidateIds, start, end)
  const denominator = activeCustomerIds.size

  // Pagos del mes, para saber quiénes pagaron y con qué día. Filtrar por los
  // mismos tipos excluidos para mantener consistencia con el denominador.
  const { data: paymentsRaw } = await supabase
    .from('membership_payments')
    .select('customer_id, payment_date, membership_type')
    .gte('payment_date', start.toISOString())
    .lt('payment_date', end.toISOString())
    .not('membership_type', 'in', `(${CYCLE_EXCLUDED_MEMBERSHIP_TYPES.join(',')})`)

  // Un socio puede tener varios pagos en el mes; el "más temprano" define su fase.
  const earliestPaymentByCustomer = new Map<string, Date>()

  ;(paymentsRaw ?? []).forEach((p) => {
    if (!activeCustomerIds.has(p.customer_id)) return
    const date = new Date(p.payment_date)
    const current = earliestPaymentByCustomer.get(p.customer_id)

    if (!current || date < current) earliestPaymentByCustomer.set(p.customer_id, date)
  })

  let paidWithoutSurcharge = 0
  let paidWithSurcharge = 0

  earliestPaymentByCustomer.forEach((date) => {
    const { day } = getAppTzDateParts(date)

    if (day <= ACTITUD_BILLING_POLICY.gracePeriodEnd) paidWithoutSurcharge += 1
    else paidWithSurcharge += 1
  })

  const paidCount = earliestPaymentByCustomer.size
  const pendingCount = Math.max(0, denominator - paidCount)

  // ¿Es el mes actual? Si sí, incluir el día en curso para la UI.
  const now = new Date()
  const { year: nowYear, month: nowMonth, day: nowDay } = getAppTzDateParts(now)
  const [qYear, qMonth] = monthKey.split('-').map(Number)
  const isCurrentMonth = nowYear === qYear && nowMonth === qMonth

  return {
    denominator,
    paid_count: paidCount,
    paid_without_surcharge: paidWithoutSurcharge,
    paid_with_surcharge: paidWithSurcharge,
    pending_count: pendingCount,
    current_day_of_month: isCurrentMonth ? nowDay : null,
  }
}

// Breakdown por tipo de membresía.
async function getPaymentBreakdownByType(
  supabase: Awaited<ReturnType<typeof createClient>>,
  monthKey: string
): Promise<IncomesByMembershipType[]> {
  const { start, end } = getMonthRangeFromKey(monthKey)
  const { data } = await supabase
    .from('membership_payments')
    .select('membership_type, amount')
    .gte('payment_date', start.toISOString())
    .lt('payment_date', end.toISOString())

  const groups = new Map<string, { total: number; count: number }>()

  ;(data ?? []).forEach((p) => {
    const key = p.membership_type
    const entry = groups.get(key) ?? { total: 0, count: 0 }

    entry.total += p.amount ?? 0
    entry.count += 1
    groups.set(key, entry)
  })

  return Array.from(groups.entries())
    .map(([membership_type, { total, count }]) => ({ membership_type, total, count }))
    .sort((a, b) => b.total - a.total)
}

// Breakdown por método de pago.
async function getPaymentBreakdownByMethod(
  supabase: Awaited<ReturnType<typeof createClient>>,
  monthKey: string
): Promise<IncomesByPaymentMethod[]> {
  const { start, end } = getMonthRangeFromKey(monthKey)
  const { data } = await supabase
    .from('membership_payments')
    .select('payment_method, amount')
    .gte('payment_date', start.toISOString())
    .lt('payment_date', end.toISOString())

  const groups = new Map<string, { total: number; count: number }>()

  ;(data ?? []).forEach((p) => {
    const key = p.payment_method ?? 'unknown'
    const entry = groups.get(key) ?? { total: 0, count: 0 }

    entry.total += p.amount ?? 0
    entry.count += 1
    groups.set(key, entry)
  })

  return Array.from(groups.entries())
    .map(([payment_method, { total, count }]) => ({ payment_method, total, count }))
    .sort((a, b) => b.total - a.total)
}

// Descuentos aplicados en el mes: total, cantidad y breakdown por regla.
async function getMonthlyDiscounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  monthKey: string
): Promise<IncomesDiscounts> {
  const { start, end } = getMonthRangeFromKey(monthKey)
  const { data } = await supabase
    .from('membership_payments')
    .select('discount_amount, discount_rule:discount_rules(name)')
    .gt('discount_amount', 0)
    .gte('payment_date', start.toISOString())
    .lt('payment_date', end.toISOString())

  const rows = (data ?? []) as unknown as Array<{
    discount_amount: number
    discount_rule: { name: string } | null
  }>
  const total = rows.reduce((sum, r) => sum + (r.discount_amount ?? 0), 0)
  const count = rows.length
  const ruleCounts = new Map<string | null, number>()

  rows.forEach((r) => {
    const ruleName = r.discount_rule?.name ?? null

    ruleCounts.set(ruleName, (ruleCounts.get(ruleName) ?? 0) + 1)
  })

  const by_rule: DiscountRuleBreakdown[] = Array.from(ruleCounts.entries())
    .map(([rule_name, count]) => ({ rule_name, count }))
    .sort((a, b) => b.count - a.count)

  return { total, count, by_rule }
}

// Últimos N pagos con datos del cliente y regla de descuento (si aplica).
async function getRecentPayments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  limit: number
): Promise<RecentPayment[]> {
  const { data } = await supabase
    .from('membership_payments')
    .select(
      `
      id,
      customer_id,
      amount,
      gross_amount,
      discount_amount,
      payment_date,
      payment_method,
      membership_type,
      customer:customers(first_name, last_name),
      discount_rule:discount_rules(name)
    `
    )
    .order('payment_date', { ascending: false })
    .limit(limit)

  const rows = (data ?? []) as unknown as Array<{
    id: string
    customer_id: string
    amount: number
    gross_amount: number
    discount_amount: number
    payment_date: string
    payment_method: string
    membership_type: string
    customer: { first_name: string; last_name: string } | null
    discount_rule: { name: string } | null
  }>

  return rows.map((r) => ({
    id: r.id,
    customer_id: r.customer_id,
    first_name: r.customer?.first_name ?? '',
    last_name: r.customer?.last_name ?? '',
    amount: r.amount,
    gross_amount: r.gross_amount ?? r.amount,
    discount_amount: r.discount_amount ?? 0,
    discount_rule_name: r.discount_rule?.name ?? null,
    payment_date: r.payment_date,
    payment_method: r.payment_method,
    membership_type: r.membership_type,
  }))
}

// Serie de ingresos de los últimos 6 meses (incluyendo el mes consultado y los 5 previos).
async function getLast6MonthsIncome(
  supabase: Awaited<ReturnType<typeof createClient>>,
  anchorMonthKey: string
): Promise<MonthlyIncomePoint[]> {
  const [anchorYear, anchorMonth] = anchorMonthKey.split('-').map(Number)
  // Ventana de 6 meses hacia atrás terminando en el mes ancla (inclusive).
  const windowStart = utcInstantAtAppTzWallClock(anchorYear, anchorMonth - 5, 1, 0, 0, 0)
  const windowEnd = utcInstantAtAppTzWallClock(anchorYear, anchorMonth + 1, 1, 0, 0, 0)
  const { data } = await supabase
    .from('membership_payments')
    .select('amount, payment_date')
    .gte('payment_date', windowStart.toISOString())
    .lt('payment_date', windowEnd.toISOString())

  const totals = new Map<string, number>()

  ;(data ?? []).forEach((p) => {
    // Agrupar por año-mes en AR para evitar que un pago de las 22 hs AR caiga en el mes siguiente en UTC.
    const { year, month } = getAppTzDateParts(new Date(p.payment_date))
    const key = `${year}-${String(month).padStart(2, '0')}`

    totals.set(key, (totals.get(key) ?? 0) + (p.amount ?? 0))
  })

  // Construir los 6 slots en orden descendente (más reciente primero).
  const points: MonthlyIncomePoint[] = []

  for (let offset = 0; offset < 6; offset += 1) {
    const targetMonth = anchorMonth - offset
    const targetYear = anchorYear + Math.floor((targetMonth - 1) / 12)
    const normalizedMonth = ((targetMonth - 1) % 12 + 12) % 12 + 1
    const key = `${targetYear}-${String(normalizedMonth).padStart(2, '0')}`

    points.push({ month: key, total: totals.get(key) ?? 0 })
  }

  return points
}

// Valida "YYYY-MM" y devuelve el rango del mes en TZ del negocio.
function validateAndRangeFromKey(monthKey: string): { start: Date; end: Date } {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) {
    throw new Error(`Invalid month format: ${monthKey}. Expected YYYY-MM.`)
  }
  parseAppTzDateString(`${monthKey}-01`)

  return getMonthRangeFromKey(monthKey)
}

// Drill-down: lista de socios que están en el denominador del ciclo pero no
// pagaron aún en el mes. Aplica los mismos filtros que
// `getBillingCycleProgress` (tipo renovable + asistencia en el mes) para que
// la lista coincida con el contador del bloque.
export async function getPendingCustomers(monthKey: string): Promise<PendingCustomer[]> {
  await requireAdmin()
  const { start, end } = validateAndRangeFromKey(monthKey)
  const supabase = await createClient()

  const { data: activeMembers } = await supabase
    .from('customer_membership')
    .select(
      `
      customer_id,
      membership_type,
      expiration_date,
      last_payment_date,
      customer:customers(first_name, last_name)
    `
    )
    .gte('expiration_date', start.toISOString())
    .not('membership_type', 'in', `(${CYCLE_EXCLUDED_MEMBERSHIP_TYPES.join(',')})`)

  const rows = (activeMembers ?? []) as unknown as Array<{
    customer_id: string
    membership_type: string
    expiration_date: string
    last_payment_date: string | null
    customer: { first_name: string; last_name: string } | null
  }>

  if (rows.length === 0) return []

  const candidateIds = rows.map((r) => r.customer_id)
  const withAssistance = await filterByAssistanceInRange(supabase, candidateIds, start, end)

  // Quiénes pagaron en el mes.
  const { data: paymentsRaw } = await supabase
    .from('membership_payments')
    .select('customer_id')
    .gte('payment_date', start.toISOString())
    .lt('payment_date', end.toISOString())
    .not('membership_type', 'in', `(${CYCLE_EXCLUDED_MEMBERSHIP_TYPES.join(',')})`)
    .in('customer_id', candidateIds)

  const paidCustomerIds = new Set((paymentsRaw ?? []).map((p) => p.customer_id))

  return rows
    .filter((r) => withAssistance.has(r.customer_id) && !paidCustomerIds.has(r.customer_id))
    .map((r) => ({
      customer_id: r.customer_id,
      first_name: r.customer?.first_name ?? '',
      last_name: r.customer?.last_name ?? '',
      membership_type: r.membership_type,
      expiration_date: r.expiration_date,
      last_payment_date: r.last_payment_date,
    }))
    .sort((a, b) => a.expiration_date.localeCompare(b.expiration_date))
}

// Drill-down: todos los pagos del mes para un tipo, agrupados por cliente.
// Util para detectar quién repite pases (típicamente DAILY con múltiples
// compras en el mismo mes).
export async function getPaymentsByType(
  monthKey: string,
  membershipType: string
): Promise<CustomerPaymentsGroup[]> {
  await requireAdmin()
  const { start, end } = validateAndRangeFromKey(monthKey)
  const supabase = await createClient()

  const { data } = await supabase
    .from('membership_payments')
    .select(
      `
      id,
      customer_id,
      amount,
      payment_date,
      payment_method,
      customer:customers(first_name, last_name)
    `
    )
    .eq('membership_type', membershipType)
    .gte('payment_date', start.toISOString())
    .lt('payment_date', end.toISOString())
    .order('payment_date', { ascending: true })

  const rows = (data ?? []) as unknown as Array<{
    id: string
    customer_id: string
    amount: number
    payment_date: string
    payment_method: string
    customer: { first_name: string; last_name: string } | null
  }>

  const groups = new Map<string, CustomerPaymentsGroup>()

  rows.forEach((r) => {
    const existing = groups.get(r.customer_id)
    const payment: PaymentInGroup = {
      id: r.id,
      payment_date: r.payment_date,
      amount: r.amount,
      payment_method: r.payment_method,
    }

    if (existing) {
      existing.payments.push(payment)
      existing.total_amount += r.amount
    } else {
      groups.set(r.customer_id, {
        customer_id: r.customer_id,
        first_name: r.customer?.first_name ?? '',
        last_name: r.customer?.last_name ?? '',
        payments: [payment],
        total_amount: r.amount,
      })
    }
  })

  // Ordenar: clientes con más pagos primero (los "power users" del tipo),
  // desempate por total_amount.
  return Array.from(groups.values()).sort((a, b) => {
    if (b.payments.length !== a.payments.length) return b.payments.length - a.payments.length

    return b.total_amount - a.total_amount
  })
}

// Función paraguas — orquesta todas las sub-consultas en paralelo.
export async function getIncomesSummary(monthKey: string): Promise<IncomesSummary> {
  await requireAdmin()
  // Validar formato "YYYY-MM" — evitar strings malformados que rompan el parse.
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) {
    throw new Error(`Invalid month format: ${monthKey}. Expected YYYY-MM.`)
  }
  // Sanidad: parsear como fecha AR para asegurar que el mes exista realmente.
  parseAppTzDateString(`${monthKey}-01`)

  const supabase = await createClient()

  const [
    cobrado,
    cycle,
    by_membership_type,
    by_payment_method,
    discounts,
    recent_payments,
    last_6_months,
  ] = await Promise.all([
    getIncomesCobrado(supabase, monthKey),
    getBillingCycleProgress(supabase, monthKey),
    getPaymentBreakdownByType(supabase, monthKey),
    getPaymentBreakdownByMethod(supabase, monthKey),
    getMonthlyDiscounts(supabase, monthKey),
    getRecentPayments(supabase, 5),
    getLast6MonthsIncome(supabase, monthKey),
  ])

  return {
    month: monthKey,
    cobrado,
    cycle,
    by_membership_type,
    by_payment_method,
    discounts,
    recent_payments,
    last_6_months,
  }
}
