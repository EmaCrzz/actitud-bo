import { isRealAppTzDate } from '@/lib/date-range-params'
import { parseAppTzDateString } from '@/lib/timezone'
import { PaymentTypeArray } from '@/membership/consts'
import type { SaleInput } from './types'

/** Un input que la ruta rechaza con 400. El mensaje no es para el operador. */
export class SaleValidationError extends Error {}

/**
 * Valida y normaliza el input de una venta a la fila que se escribe.
 *
 * La DB tiene sus CHECK, pero un 23514 llega al operador como "no pudimos
 * guardar" sin decir qué. Validar acá devuelve un 400 con motivo, y —sobre
 * todo— es **el único lugar donde se canonicaliza `sale_date`**: el string del
 * datepicker crudo sería midnight UTC, 21:00 del día anterior en AR, y una
 * venta del día 1 caería en el mes contable anterior.
 *
 * Es puro y vive fuera de `api/server.ts` para poder fijarlo con unit tests
 * sin levantar un cliente de Supabase.
 */
export function normalizeSaleInput(input: SaleInput) {
  const description = input.description?.trim()
  const amount = Number(input.amount)
  const isoDay = typeof input.sale_date === 'string' ? input.sale_date.slice(0, 10) : ''

  if (!description) throw new SaleValidationError('description is required')
  if (!Number.isFinite(amount) || amount <= 0) throw new SaleValidationError('amount must be > 0')
  if (!(PaymentTypeArray as string[]).includes(input.payment_method)) {
    throw new SaleValidationError('invalid payment_method')
  }
  if (!isRealAppTzDate(isoDay)) throw new SaleValidationError('invalid sale_date')

  const customerId = input.customer_id || null

  return {
    customer_id: customerId,
    // Con cliente, el nombre sale de su ficha: guardarlo también rompería el
    // CHECK `sales_single_buyer_check`, y con razón.
    buyer_name: customerId ? null : input.buyer_name?.trim() || null,
    description,
    amount,
    payment_method: input.payment_method,
    sale_date: parseAppTzDateString(isoDay).toISOString(),
  }
}
