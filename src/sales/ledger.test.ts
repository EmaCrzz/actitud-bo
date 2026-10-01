import { describe, it, expect } from 'vitest'
import { buildSalesLedger, compareLedgerEntries } from './ledger'
import { SALE_KIND_MEMBERSHIP, SALE_KIND_PRODUCT, type Sale } from './types'
import { PAYMENT_CASH, PAYMENT_TRANSFER } from '@/membership/consts'
import type { MembershipPayment } from '@/accounting/types'

/**
 * La unión de cuotas y productos que alimenta Ventas.
 *
 * Lo que se protege: que **ninguna fila se pierda ni se duplique** al unir dos
 * tablas cuyos `id` podrían coincidir, que el nombre de quien pagó salga de un
 * solo lugar, y que el orden respete el **día AR**. Los tres errores producen
 * una tabla que se ve bien.
 */
function payment(overrides: Partial<MembershipPayment> = {}): MembershipPayment {
  return {
    id: 'p-1',
    customer_id: 'c-1',
    membership_type: 'MEMBERSHIP_TYPE_5_DAYS',
    amount: 15000,
    gross_amount: 15000,
    discount_amount: 0,
    discount_rule_id: null,
    discount_note: null,
    surcharge_amount: 0,
    surcharge_note: null,
    receipt_number: null,
    payment_date: '2026-09-10T14:00:00.000Z',
    period_start: '2026-09-10T03:00:00.000Z',
    payment_method: PAYMENT_TRANSFER,
    created_at: '2026-09-10T14:00:00.000Z',
    customer: { first_name: 'Ana', last_name: 'Beltrán' },
    plan: { name: null },
    ...overrides,
  }
}

function sale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: 's-1',
    customer_id: null,
    buyer_name: null,
    description: 'Remera Hombre Talle L',
    amount: 20000,
    payment_method: PAYMENT_CASH,
    // Medianoche AR del 10/09.
    sale_date: '2026-09-10T03:00:00.000Z',
    created_at: '2026-09-10T15:00:00.000Z',
    updated_at: '2026-09-10T15:00:00.000Z',
    customer: null,
    ...overrides,
  }
}

describe('buildSalesLedger', () => {
  it('une cuotas y productos sin perder ni duplicar filas, aunque los id coincidan', () => {
    const ledger = buildSalesLedger([payment({ id: 'x' })], [sale({ id: 'x' })])

    expect(ledger).toHaveLength(2)
    expect(new Set(ledger.map((entry) => entry.key)).size).toBe(2)
    expect(ledger.map((entry) => entry.kind).sort()).toEqual([
      SALE_KIND_MEMBERSHIP,
      SALE_KIND_PRODUCT,
    ])
  })

  it('una cuota toma el nombre del cliente y el nombre libre del plan', () => {
    const [entry] = buildSalesLedger(
      [payment({ membership_type: 'PLAN_FUNCIONAL', plan: { name: 'Funcional' } })],
      []
    )

    expect(entry.buyerName).toBe('Ana Beltrán')
    expect(entry.kind === SALE_KIND_MEMBERSHIP && entry.planName).toBe('Funcional')
  })

  it('un producto con cliente muestra el nombre del cliente', () => {
    const [entry] = buildSalesLedger(
      [],
      [sale({ customer_id: 'c-2', customer: { first_name: 'Carlos', last_name: 'Díaz' } })]
    )

    expect(entry.buyerName).toBe('Carlos Díaz')
    expect(entry.customerId).toBe('c-2')
  })

  it('un producto sin cliente usa los datos de referencia, recortados', () => {
    const [entry] = buildSalesLedger([], [sale({ buyer_name: '  Federico Villanueva ' })])

    expect(entry.buyerName).toBe('Federico Villanueva')
  })

  it('sin cliente ni datos de referencia el comprador queda en null, no en ""', () => {
    // La tabla muestra "Sin cliente" con `??`. Un string vacío lo saltaría y
    // la celda quedaría en blanco.
    const [blank] = buildSalesLedger([], [sale({ buyer_name: '   ' })])
    const [missing] = buildSalesLedger([], [sale({ buyer_name: null })])

    expect(blank.buyerName).toBeNull()
    expect(missing.buyerName).toBeNull()
  })

  it('ordena de más nuevo a más viejo por día', () => {
    const ledger = buildSalesLedger(
      [payment({ id: 'old', payment_date: '2026-09-01T14:00:00.000Z' })],
      [sale({ id: 'new', sale_date: '2026-09-20T03:00:00.000Z', created_at: '2026-09-20T15:00:00.000Z' })]
    )

    expect(ledger.map((entry) => entry.key)).toEqual(['product:new', 'membership:old'])
  })
})

describe('compareLedgerEntries', () => {
  it('dentro de un mismo día AR ordena por momento de carga, no por la medianoche del producto', () => {
    // El producto guarda 03:00Z (medianoche AR) aunque se cargó a las 12:00 AR,
    // entre la cuota de las 10:00 y la de las 18:00. Ordenando por `date`
    // quedaría último del día; tiene que quedar en el medio.
    const ledger = buildSalesLedger(
      [
        payment({ id: 'morning', payment_date: '2026-09-10T13:00:00.000Z', created_at: '2026-09-10T13:00:00.000Z' }),
        payment({ id: 'evening', payment_date: '2026-09-10T21:00:00.000Z', created_at: '2026-09-10T21:00:00.000Z' }),
      ],
      [sale({ id: 'noon', created_at: '2026-09-10T15:00:00.000Z' })]
    )

    expect(ledger.map((entry) => entry.key)).toEqual([
      'membership:evening',
      'product:noon',
      'membership:morning',
    ])
  })

  it('una cuota cobrada a las 22:00 AR pertenece a su día AR, no al día UTC siguiente', () => {
    // 22:00 AR del 10/09 = 01:00Z del 11/09. Comparada en UTC caería en el 11 y
    // quedaría por delante de un producto del 11 cargado más temprano.
    const late = buildSalesLedger(
      [payment({ id: 'late', payment_date: '2026-09-11T01:00:00.000Z', created_at: '2026-09-11T01:00:00.000Z' })],
      []
    )[0]
    const nextDay = buildSalesLedger(
      [],
      [sale({ id: 'next', sale_date: '2026-09-11T03:00:00.000Z', created_at: '2026-09-11T03:30:00.000Z' })]
    )[0]

    expect(compareLedgerEntries(late, nextDay, 'asc')).toBeLessThan(0)
  })

  it('asc y desc son el mismo orden invertido', () => {
    const [a, b] = buildSalesLedger(
      [payment({ id: 'a', payment_date: '2026-09-01T14:00:00.000Z' })],
      [sale({ id: 'b' })]
    )

    expect(Math.sign(compareLedgerEntries(a, b, 'asc'))).toBe(-Math.sign(compareLedgerEntries(a, b, 'desc')))
  })
})
