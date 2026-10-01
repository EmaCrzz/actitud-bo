import { describe, it, expect } from 'vitest'
import { matchesSaleFilters, parseSaleFilters, saleFiltersToQueryString } from './filters'
import { buildSalesLedger } from './ledger'
import { PAYMENT_CASH, PAYMENT_TRANSFER } from '@/membership/consts'
import { utcInstantAtAppTzWallClock } from '@/lib/timezone'
import type { MembershipPayment } from '@/accounting/types'
import { SALE_KIND_MEMBERSHIP, SALE_KIND_PRODUCT, type Sale } from './types'

const membership = buildSalesLedger(
  [
    {
      id: 'p',
      customer_id: 'c',
      membership_type: 'MEMBERSHIP_TYPE_5_DAYS',
      amount: 15000,
      payment_date: '2026-09-10T14:00:00.000Z',
      payment_method: PAYMENT_TRANSFER,
      created_at: '2026-09-10T14:00:00.000Z',
      customer: { first_name: 'Ana', last_name: 'Beltrán' },
      plan: null,
    } as MembershipPayment,
  ],
  []
)[0]

const walkIn = buildSalesLedger(
  [],
  [
    {
      id: 's',
      customer_id: null,
      buyer_name: null,
      description: 'Remera Hombre Talle L',
      amount: 20000,
      payment_method: PAYMENT_CASH,
      sale_date: '2026-09-10T03:00:00.000Z',
      created_at: '2026-09-10T15:00:00.000Z',
      updated_at: '2026-09-10T15:00:00.000Z',
    } as Sale,
  ]
)[0]

describe('parseSaleFilters', () => {
  // Medianoche AR del 1/9: en UTC son las 03:00 del 1/9, pero un cálculo en UTC
  // de "el mes de ahora" a las 00:30 AR daría agosto.
  const firstOfSeptemberAr = utcInstantAtAppTzWallClock(2026, 9, 1, 0, 30)

  it('sin params, el rango es el mes AR en curso', () => {
    expect(parseSaleFilters({}, firstOfSeptemberAr)).toEqual({
      query: '',
      from: '2026-09-01',
      to: '2026-09-30',
      method: null,
      kind: null,
    })
  })

  it('un concepto fuera del vocabulario no filtra', () => {
    expect(parseSaleFilters({ kind: 'refund' }, firstOfSeptemberAr).kind).toBeNull()
    expect(parseSaleFilters({ kind: SALE_KIND_MEMBERSHIP }, firstOfSeptemberAr).kind).toBe(
      SALE_KIND_MEMBERSHIP
    )
  })

  it('un método fuera del vocabulario no filtra', () => {
    expect(parseSaleFilters({ method: 'unspecified' }, firstOfSeptemberAr).method).toBeNull()
    expect(parseSaleFilters({ method: PAYMENT_CASH }, firstOfSeptemberAr).method).toBe(PAYMENT_CASH)
  })

  it('round trip con la URL', () => {
    const filters = {
      query: 'ana',
      from: '2026-09-01',
      to: '2026-09-15',
      method: PAYMENT_CASH,
      kind: SALE_KIND_PRODUCT,
    }
    const params = Object.fromEntries(new URLSearchParams(saleFiltersToQueryString(filters, 2)))

    expect(parseSaleFilters(params, firstOfSeptemberAr)).toEqual(filters)
    expect(params.page).toBe('3')
  })
})

describe('matchesSaleFilters', () => {
  it('el método filtra cuotas y productos por igual', () => {
    expect(matchesSaleFilters(membership, { query: '', method: PAYMENT_CASH, kind: null })).toBe(false)
    expect(matchesSaleFilters(walkIn, { query: '', method: PAYMENT_CASH, kind: null })).toBe(true)
  })

  it('busca por nombre sin importar acentos ni mayúsculas', () => {
    expect(matchesSaleFilters(membership, { query: 'BELTRAN', method: null, kind: null })).toBe(true)
  })

  it('en un producto busca también por el detalle — una venta sin cliente no tiene otro dato', () => {
    expect(matchesSaleFilters(walkIn, { query: 'remera', method: null, kind: null })).toBe(true)
    expect(matchesSaleFilters(walkIn, { query: 'ana', method: null, kind: null })).toBe(false)
  })

  it('el concepto separa cuotas de productos', () => {
    const onlyProducts = { query: '', method: null, kind: SALE_KIND_PRODUCT }
    const onlyMemberships = { query: '', method: null, kind: SALE_KIND_MEMBERSHIP }

    expect(matchesSaleFilters(walkIn, onlyProducts)).toBe(true)
    expect(matchesSaleFilters(membership, onlyProducts)).toBe(false)
    expect(matchesSaleFilters(membership, onlyMemberships)).toBe(true)
    expect(matchesSaleFilters(walkIn, onlyMemberships)).toBe(false)
  })

  it('sin búsqueda ni método pasa todo', () => {
    expect(matchesSaleFilters(walkIn, { query: '   ', method: null, kind: null })).toBe(true)
  })
})
