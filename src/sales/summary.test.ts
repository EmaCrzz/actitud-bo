import { describe, it, expect } from 'vitest'
import { summarizeSalesLedger } from './summary'
import { SALE_KIND_MEMBERSHIP, SALE_KIND_PRODUCT, type SalesLedgerEntry } from './types'
import { PAYMENT_CASH, PAYMENT_TRANSFER } from '@/membership/consts'

/**
 * Los tres KPIs de Ventas. Lo que importa es que **sumen cuotas y productos
 * juntos**: "Total cobrado" es todo lo que entró, y un KPI que contara sólo una
 * de las dos tablas mostraría un número plausible y falso.
 */
function entry(
  kind: typeof SALE_KIND_MEMBERSHIP | typeof SALE_KIND_PRODUCT,
  amount: number,
  paymentMethod: string
): SalesLedgerEntry {
  const base = {
    key: `${kind}-${amount}-${paymentMethod}`,
    date: '2026-09-10T03:00:00.000Z',
    createdAt: '2026-09-10T03:00:00.000Z',
    amount,
    paymentMethod,
    customerId: null,
    buyerName: null,
  }

  return kind === SALE_KIND_MEMBERSHIP
    ? {
        ...base,
        kind,
        membershipType: 'MEMBERSHIP_TYPE_5_DAYS',
        planName: null,
        discountAmount: 0,
        surchargeAmount: 0,
        weeklyQuota: null,
      }
    : {
        ...base,
        kind,
        description: 'Remera',
        sale: {
          id: 's',
          customer_id: null,
          buyer_name: null,
          description: 'Remera',
          amount,
          payment_method: paymentMethod,
          sale_date: base.date,
          created_at: base.date,
          updated_at: base.date,
        },
      }
}

describe('summarizeSalesLedger', () => {
  it('suma cuotas y productos en el total y en su medio de pago', () => {
    const result = summarizeSalesLedger([
      entry(SALE_KIND_MEMBERSHIP, 15000, PAYMENT_TRANSFER),
      entry(SALE_KIND_MEMBERSHIP, 12000, PAYMENT_CASH),
      entry(SALE_KIND_PRODUCT, 20000, PAYMENT_CASH),
    ])

    expect(result.total).toBe(47000)
    expect(result.cash).toBe(32000)
    expect(result.transfer).toBe(15000)
    expect(result.count).toBe(3)
  })

  it('con los dos medios de pago conocidos, efectivo + transferencias da el total', () => {
    const result = summarizeSalesLedger([
      entry(SALE_KIND_PRODUCT, 1000, PAYMENT_CASH),
      entry(SALE_KIND_MEMBERSHIP, 2500, PAYMENT_TRANSFER),
    ])

    expect(result.cash + result.transfer).toBe(result.total)
  })

  it('un medio de pago desconocido suma al total y a ningún método', () => {
    // No debería existir —las dos tablas lo exigen—, pero si aparece se tiene
    // que ver como descuadre, no repartirse en silencio.
    const result = summarizeSalesLedger([entry(SALE_KIND_MEMBERSHIP, 5000, 'PAYMENT_CHECK')])

    expect(result.total).toBe(5000)
    expect(result.cash + result.transfer).toBe(0)
  })

  it('sin filas, todo en cero', () => {
    expect(summarizeSalesLedger([])).toEqual({ total: 0, cash: 0, transfer: 0, count: 0 })
  })
})
