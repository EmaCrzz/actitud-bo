import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/auth/api/server'
import { getMembershipPayments } from '@/accounting/api/server'
import { toAppTzQueryBounds, type IsoDateRange } from '@/lib/date-range-params'
import { buildSalesLedger } from '../ledger'
import { normalizeSaleInput } from '../normalize'
import type { Sale, SaleInput, SalesLedgerEntry } from '../types'

const SALE_SELECT = '*, customer:customers(first_name, last_name)'

export { SaleValidationError } from '../normalize'

/**
 * Todo lo cobrado en un rango de días AR: cuotas + ventas de producto.
 *
 * Las dos lecturas **tiran si fallan** —también `getMembershipPayments`, desde
 * esta fase—: con una de las dos caída, la sección mostraría un total cobrado
 * a medias con cara de completo.
 */
export async function getSalesLedger(range: IsoDateRange): Promise<SalesLedgerEntry[]> {
  await requireAdmin()

  const [payments, sales] = await Promise.all([getMembershipPayments(range), getSales(range)])

  return buildSalesLedger(payments, sales)
}

async function getSales(range: IsoDateRange): Promise<Sale[]> {
  const supabase = await createClient()
  const bounds = toAppTzQueryBounds(range)

  let query = supabase.from('sales').select(SALE_SELECT)

  if (bounds.gte) query = query.gte('sale_date', bounds.gte)
  if (bounds.lt) query = query.lt('sale_date', bounds.lt)

  const { data, error } = await query

  if (error) throw new Error(error.message)

  return (data ?? []) as Sale[]
}

export async function createSale(input: SaleInput): Promise<Sale> {
  await requireAdmin()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sales')
    .insert([normalizeSaleInput(input)])
    .select(SALE_SELECT)
    .single()

  if (error) throw new Error(error.message)

  return data as Sale
}

export async function updateSale(id: string, input: SaleInput): Promise<Sale> {
  await requireAdmin()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sales')
    .update(normalizeSaleInput(input))
    .eq('id', id)
    .select(SALE_SELECT)
    .single()

  if (error) throw new Error(error.message)

  return data as Sale
}

export async function deleteSale(id: string): Promise<void> {
  await requireAdmin()

  const supabase = await createClient()
  const { error } = await supabase.from('sales').delete().eq('id', id)

  if (error) throw new Error(error.message)
}
