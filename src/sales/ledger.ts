import { toAppTzIsoDate } from '@/lib/timezone'
import type { MembershipPayment } from '@/accounting/types'
import {
  SALE_KIND_MEMBERSHIP,
  SALE_KIND_PRODUCT,
  type Sale,
  type SalesLedgerEntry,
} from './types'

/**
 * Une las cuotas y las ventas de producto de un período en una sola lista.
 *
 * **Es una unión, no una copia.** Ninguna cuota se escribe en `sales`: si se
 * escribiera, toda suma de ingresos —esta sección, el Balance de la Fase 13—
 * tendría que acordarse de excluirla, y la que se olvide contaría la plata dos
 * veces sin ningún error visible.
 *
 * Se hace en memoria y no con una vista SQL porque son ~100 filas por mes
 * (medido en prod el 2026-10-01: 108 cuotas en septiembre) y porque así la
 * regla queda en una función pura con tests, en vez de en un objeto de la DB
 * que sólo se verifica a mano.
 */
export function buildSalesLedger(payments: MembershipPayment[], sales: Sale[]): SalesLedgerEntry[] {
  const entries: SalesLedgerEntry[] = [
    ...payments.map(
      (payment): SalesLedgerEntry => ({
        kind: SALE_KIND_MEMBERSHIP,
        key: `${SALE_KIND_MEMBERSHIP}:${payment.id}`,
        date: payment.payment_date,
        createdAt: payment.created_at,
        amount: payment.amount ?? 0,
        paymentMethod: payment.payment_method,
        customerId: payment.customer_id,
        buyerName: fullName(payment.customer),
        membershipType: payment.membership_type,
        planName: payment.plan?.name ?? null,
        discountAmount: payment.discount_amount ?? 0,
        surchargeAmount: payment.surcharge_amount ?? 0,
        weeklyQuota: payment.plan?.weekly_quota ?? null,
      })
    ),
    ...sales.map(
      (sale): SalesLedgerEntry => ({
        kind: SALE_KIND_PRODUCT,
        key: `${SALE_KIND_PRODUCT}:${sale.id}`,
        date: sale.sale_date,
        createdAt: sale.created_at,
        amount: sale.amount ?? 0,
        paymentMethod: sale.payment_method,
        customerId: sale.customer_id,
        // El CHECK `sales_single_buyer_check` garantiza que no vengan los dos.
        buyerName: sale.customer ? fullName(sale.customer) : sale.buyer_name?.trim() || null,
        description: sale.description,
        sale,
      })
    ),
  ]

  return entries.sort((a, b) => compareLedgerEntries(a, b, 'desc'))
}

/**
 * Orden del listado: **por día AR, y dentro del día por momento de carga**.
 *
 * No alcanza con comparar `date`. Una cuota guarda la hora real del cobro y
 * una venta de producto la medianoche AR de su día, así que ordenando por
 * timestamp todas las ventas de un día quedarían pegadas al final (o al
 * principio) de ese día, aunque se hayan cargado entre dos cuotas. El día
 * contable manda; `created_at` sólo desempata.
 */
export function compareLedgerEntries(
  a: SalesLedgerEntry,
  b: SalesLedgerEntry,
  direction: 'asc' | 'desc'
): number {
  const byDay = toAppTzIsoDate(a.date).localeCompare(toAppTzIsoDate(b.date))
  const diff = byDay !== 0 ? byDay : a.createdAt.localeCompare(b.createdAt)

  return direction === 'asc' ? diff : -diff
}

function fullName(person: { first_name: string; last_name: string } | null | undefined) {
  if (!person) return null

  return `${person.first_name} ${person.last_name}`.trim() || null
}
