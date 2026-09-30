import { describe, it, expect } from 'vitest'
import { summarizeExpenses } from './summary'
import { PAYMENT_CASH, PAYMENT_TRANSFER } from '@/membership/consts'
import type { Expense } from '@/accounting/types'

/**
 * Los tres KPIs de Gastos.
 *
 * Lo que se protege acá no es la suma —eso es un `reduce`— sino el tratamiento
 * de los gastos **sin medio de pago**, que en producción son todos los
 * anteriores a la Fase 11 y todos los reintegros. Un error ahí no rompe nada:
 * muestra tres números plausibles donde uno está mal.
 */
function expense(amount: number, payment_method: string | null): Expense {
  return {
    id: `e-${amount}-${payment_method ?? 'null'}`,
    description: 'Gasto de prueba',
    amount,
    category: 'SERVICES',
    expense_date: '2026-09-15T03:00:00.000Z',
    payment_method,
    created_at: '2026-09-15T03:00:00.000Z',
  }
}

describe('summarizeExpenses', () => {
  it('separa efectivo de transferencia', () => {
    const result = summarizeExpenses([
      expense(10000, PAYMENT_CASH),
      expense(5000, PAYMENT_CASH),
      expense(20000, PAYMENT_TRANSFER),
    ])

    expect(result.cash).toBe(15000)
    expect(result.transfer).toBe(20000)
    expect(result.total).toBe(35000)
    expect(result.count).toBe(3)
  })

  it('un gasto sin medio de pago suma al total pero a ningún KPI de método', () => {
    // El caso de los 29 gastos históricos y de los reintegros del RPC.
    const result = summarizeExpenses([expense(400000, null)])

    expect(result.total).toBe(400000)
    expect(result.cash).toBe(0)
    expect(result.transfer).toBe(0)
    expect(result.unspecified).toBe(400000)
  })

  it('el total no es la suma de efectivo y transferencia cuando hay sin especificar', () => {
    // Es la propiedad que vuelve necesario exponer `unspecified`: sin ella la
    // pantalla mostraría tres números que no cierran y nadie podría explicar
    // la diferencia.
    const result = summarizeExpenses([
      expense(10000, PAYMENT_CASH),
      expense(20000, PAYMENT_TRANSFER),
      expense(70000, null),
    ])

    expect(result.cash + result.transfer).not.toBe(result.total)
    expect(result.cash + result.transfer + result.unspecified).toBe(result.total)
  })

  it('un medio de pago desconocido cuenta como sin especificar, no se descarta', () => {
    // Si alguna vez entra un valor que el CHECK no previó, tiene que seguir
    // sumando al total: perderlo desbalancearía el balance en silencio.
    const result = summarizeExpenses([expense(3000, 'PAYMENT_CRYPTO')])

    expect(result.total).toBe(3000)
    expect(result.unspecified).toBe(3000)
  })

  it('sin gastos devuelve todo en cero', () => {
    expect(summarizeExpenses([])).toEqual({
      total: 0,
      cash: 0,
      transfer: 0,
      unspecified: 0,
      count: 0,
    })
  })
})
