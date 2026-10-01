import { describe, it, expect } from 'vitest'
import { buildBalanceSummary, BALANCE_SERIES_MONTHS } from './summary'
import { buildSalesLedger } from '@/sales/ledger'
import { SALE_KIND_PRODUCT, type Sale } from '@/sales/types'
import { PAYMENT_CASH, PAYMENT_TRANSFER } from '@/membership/consts'
import type { Expense, MembershipPayment } from '@/accounting/types'

/**
 * El Balance de un mes.
 *
 * Lo que se protege no son las sumas —son `reduce`s— sino **que la pantalla no
 * pueda contradecirse**: que cada desglose sume exactamente su total, que el
 * total de arriba sea la última barra de la serie, y que cada fila caiga en su
 * mes AR. Un error en cualquiera de las tres muestra números plausibles que no
 * cierran entre sí.
 */
let seq = 0

function payment(overrides: Partial<MembershipPayment>): MembershipPayment {
  seq += 1

  return {
    id: `p${seq}`,
    customer_id: 'c',
    membership_type: 'MEMBERSHIP_TYPE_3_DAYS',
    amount: 20000,
    gross_amount: 20000,
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
    plan: null,
    ...overrides,
  }
}

function sale(overrides: Partial<Sale>): Sale {
  seq += 1

  return {
    id: `s${seq}`,
    customer_id: null,
    buyer_name: null,
    description: 'Remera',
    amount: 15000,
    payment_method: PAYMENT_CASH,
    sale_date: '2026-09-12T03:00:00.000Z',
    created_at: '2026-09-12T15:00:00.000Z',
    updated_at: '2026-09-12T15:00:00.000Z',
    ...overrides,
  }
}

function expense(overrides: Partial<Expense>): Expense {
  seq += 1

  return {
    id: `e${seq}`,
    description: 'Gasto',
    amount: 10000,
    category: 'SERVICES',
    expense_date: '2026-09-05T03:00:00.000Z',
    payment_method: null,
    created_at: '2026-09-05T03:00:00.000Z',
    ...overrides,
  }
}

const sum = (rows: { total: number }[]) => rows.reduce((acc, row) => acc + row.total, 0)

describe('buildBalanceSummary', () => {
  const entries = buildSalesLedger(
    [
      payment({ amount: 20000, discount_amount: 2000 }),
      payment({ amount: 30000, membership_type: 'MEMBERSHIP_TYPE_5_DAYS', surcharge_amount: 5000, payment_method: PAYMENT_CASH }),
      payment({ amount: 18000, membership_type: 'PLAN_FUNCIONAL', plan: { name: 'Funcional' } }),
      // Agosto: cuenta para la serie y la comparación, no para los desgloses.
      payment({ amount: 40000, payment_date: '2026-08-20T14:00:00.000Z' }),
    ],
    [sale({ amount: 15000 }), sale({ amount: 5000, payment_method: PAYMENT_TRANSFER })]
  )
  const expenses = [
    expense({ amount: 400000, category: 'RENT' }),
    expense({ amount: 10000, category: 'Servicios' }), // categoría vieja en español
    expense({ amount: 6000, category: 'SERVICES' }),
    expense({ amount: 25000, expense_date: '2026-08-03T03:00:00.000Z' }),
  ]
  const summary = buildBalanceSummary(entries, expenses, '2026-09')

  it('el resultado es ingresos − egresos, con cuotas y productos en los ingresos', () => {
    expect(summary.current).toEqual({ income: 88000, expenses: 416000, result: -328000 })
  })

  it('cada desglose suma exactamente su total', () => {
    expect(sum(summary.incomeByConcept)).toBe(summary.current.income)
    expect(sum(summary.incomeByMethod)).toBe(summary.current.income)
    expect(sum(summary.expensesByCategory)).toBe(summary.current.expenses)
  })

  it('los productos van en una sola fila, y cada plan en la suya con su nombre libre', () => {
    const products = summary.incomeByConcept.find((row) => row.kind === SALE_KIND_PRODUCT)
    const custom = summary.incomeByConcept.find((row) => row.key === 'PLAN_FUNCIONAL')

    expect(products).toMatchObject({ total: 20000, count: 2 })
    expect(custom?.planName).toBe('Funcional')
  })

  it('por concepto va de más días a menos, el pase diario al final de los planes y los productos últimos', () => {
    // Montos al revés del orden esperado: si la lista se ordenara por monto,
    // el test lo vería.
    const plan = (type: string, quota: number, amount: number) =>
      payment({ membership_type: type, amount, plan: { name: null, weekly_quota: quota } })
    const ordered = buildBalanceSummary(
      buildSalesLedger(
        [
          plan('MEMBERSHIP_TYPE_DAILY', 1, 900000),
          plan('MEMBERSHIP_TYPE_2_DAYS', 2, 500000),
          plan('MEMBERSHIP_TYPE_5_DAYS', 5, 10000),
          plan('MEMBERSHIP_TYPE_3_DAYS', 3, 300000),
        ],
        [sale({ amount: 999999 })]
      ),
      [],
      '2026-09'
    )

    expect(ordered.incomeByConcept.map((row) => row.key)).toEqual([
      'MEMBERSHIP_TYPE_5_DAYS',
      'MEMBERSHIP_TYPE_3_DAYS',
      'MEMBERSHIP_TYPE_2_DAYS',
      'MEMBERSHIP_TYPE_DAILY',
      SALE_KIND_PRODUCT,
    ])
  })

  it('las categorías viejas en español se unen con la clave nueva', () => {
    const services = summary.expensesByCategory.filter((row) => row.key === 'SERVICES')

    expect(services).toHaveLength(1)
    expect(services[0].total).toBe(16000)
  })

  it('los desgloses van de mayor a menor', () => {
    expect(summary.expensesByCategory[0].key).toBe('RENT')
  })

  it('la serie termina en el mes elegido, y su última barra es el total de arriba', () => {
    expect(summary.series).toHaveLength(BALANCE_SERIES_MONTHS)
    expect(summary.series.at(-1)).toEqual({ month: '2026-09', ...summary.current })
    expect(summary.series.at(-2)).toEqual({ month: '2026-08', income: 40000, expenses: 25000, result: 15000 })
    expect(summary.series[0].month).toBe('2026-04')
  })

  it('compara el resultado contra el mes anterior', () => {
    expect(summary.resultDelta).toBe(-328000 - 15000)
  })

  it('suma descuentos y recargos sólo del mes elegido', () => {
    expect(summary.adjustments).toEqual({
      discounts: 2000,
      discountedCount: 1,
      surcharges: 5000,
      surchargedCount: 1,
    })
  })

  it('una cuota del 30/9 a las 22:00 AR es de septiembre, no de octubre', () => {
    const late = buildSalesLedger([payment({ amount: 7000, payment_date: '2026-10-01T01:00:00.000Z' })], [])
    const sept = buildBalanceSummary(late, [], '2026-09')
    const oct = buildBalanceSummary(late, [], '2026-10')

    expect(sept.current.income).toBe(7000)
    expect(oct.current.income).toBe(0)
  })

  it('un gasto guardado a las 00:00Z del 1/9 es del 31/8 AR: cuenta en agosto', () => {
    // Es la forma de los gastos sin canonicalizar —la reincidencia del ADR
    // 20260709153000—. Con el mes sacado del ISO caería en septiembre.
    const legacy = [expense({ amount: 9000, expense_date: '2026-09-01T00:00:00.000Z' })]

    expect(buildBalanceSummary([], legacy, '2026-08').current.expenses).toBe(9000)
    expect(buildBalanceSummary([], legacy, '2026-09').current.expenses).toBe(0)
  })

  it('sin movimientos en el mes anterior no hay comparación: sería "+ todo" por ausencia de datos', () => {
    const only = buildBalanceSummary(buildSalesLedger([payment({})], []), [], '2026-09')

    expect(only.resultDelta).toBeNull()
  })

  it('un mes sin nada da ceros y desgloses vacíos, no NaN', () => {
    const empty = buildBalanceSummary([], [], '2026-09')

    expect(empty.current).toEqual({ income: 0, expenses: 0, result: 0 })
    expect(empty.incomeByConcept).toEqual([])
    expect(empty.resultDelta).toBeNull()
  })
})
