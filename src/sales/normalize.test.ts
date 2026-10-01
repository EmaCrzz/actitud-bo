import { describe, it, expect } from 'vitest'
import { normalizeSaleInput, SaleValidationError } from './normalize'
import { PAYMENT_CASH } from '@/membership/consts'
import type { SaleInput } from './types'

/**
 * Lo que el server escribe en `sales`.
 *
 * El caso que justifica este archivo es el primero: la **canonicalización de
 * `sale_date`**. Si el string del datepicker llegara crudo a Postgres sería
 * medianoche UTC —21:00 del día anterior en AR— y una venta del día 1 caería
 * en el mes contable anterior. En pantalla las dos fechas se ven iguales.
 */
function input(overrides: Partial<SaleInput> = {}): SaleInput {
  return {
    customer_id: null,
    buyer_name: null,
    description: 'Remera Hombre Talle L',
    amount: 20000,
    payment_method: PAYMENT_CASH,
    sale_date: '2026-09-01',
    ...overrides,
  }
}

describe('normalizeSaleInput', () => {
  it('canonicaliza la fecha del datepicker a medianoche AR', () => {
    // Medianoche AR = 03:00Z. Crudo, Postgres guardaría 00:00Z = 31/08 21:00 AR.
    expect(normalizeSaleInput(input()).sale_date).toBe('2026-09-01T03:00:00.000Z')
  })

  it('rechaza un día que no existe en vez de mandarlo a Postgres', () => {
    expect(() => normalizeSaleInput(input({ sale_date: '2026-13-45' }))).toThrow(SaleValidationError)
    expect(() => normalizeSaleInput(input({ sale_date: '2026-02-30' }))).toThrow(SaleValidationError)
  })

  it('con cliente descarta los datos de referencia: el nombre sale de su ficha', () => {
    // Guardar los dos rompería `sales_single_buyer_check`.
    const row = normalizeSaleInput(input({ customer_id: 'c-1', buyer_name: 'Otro nombre' }))

    expect(row.customer_id).toBe('c-1')
    expect(row.buyer_name).toBeNull()
  })

  it('sin cliente, los datos de referencia en blanco quedan en null', () => {
    expect(normalizeSaleInput(input({ buyer_name: '   ' })).buyer_name).toBeNull()
    expect(normalizeSaleInput(input({ buyer_name: ' Fede ' })).buyer_name).toBe('Fede')
  })

  it('un customer_id vacío es una venta sin cliente', () => {
    expect(normalizeSaleInput(input({ customer_id: '' })).customer_id).toBeNull()
  })

  it('rechaza detalle vacío, monto no positivo y medio de pago desconocido', () => {
    expect(() => normalizeSaleInput(input({ description: '  ' }))).toThrow(SaleValidationError)
    expect(() => normalizeSaleInput(input({ amount: 0 }))).toThrow(SaleValidationError)
    expect(() => normalizeSaleInput(input({ amount: Number.NaN }))).toThrow(SaleValidationError)
    expect(() => normalizeSaleInput(input({ payment_method: 'PAYMENT_CHECK' }))).toThrow(
      SaleValidationError
    )
  })

  it('recorta el detalle', () => {
    expect(normalizeSaleInput(input({ description: '  Agua  ' })).description).toBe('Agua')
  })
})
