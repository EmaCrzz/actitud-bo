import { describe, it, expect } from 'vitest'
import {
  PAYMENT_METHOD_UNSPECIFIED,
  getDefaultExpenseRange,
  matchesExpenseFilters,
  parseExpenseFilters,
} from './filters'
import { PAYMENT_CASH, PAYMENT_TRANSFER } from '@/membership/consts'
import { utcInstantAtAppTzWallClock } from '@/lib/timezone'

/**
 * Filtros del listado de gastos.
 *
 * El caso que justifica el archivo es **"Sin especificar"**: no es un valor de
 * la columna sino su ausencia, así que una comparación por igualdad —la forma
 * obvia— nunca matchearía los 29 gastos previos a la Fase 11 ni los reintegros
 * que inserta el RPC. El filtro se vería funcionar y devolvería siempre vacío.
 */
function expense(description: string, payment_method: string | null) {
  return { description, payment_method }
}

describe('matchesExpenseFilters · medio de pago', () => {
  it('sin filtro pasa cualquier gasto', () => {
    const noFilter = { query: '', method: null }

    expect(matchesExpenseFilters(expense('Agua', PAYMENT_CASH), noFilter)).toBe(true)
    expect(matchesExpenseFilters(expense('Luz', null), noFilter)).toBe(true)
  })

  it('filtra por el método exacto', () => {
    const cash = { query: '', method: PAYMENT_CASH }

    expect(matchesExpenseFilters(expense('Agua', PAYMENT_CASH), cash)).toBe(true)
    expect(matchesExpenseFilters(expense('Luz', PAYMENT_TRANSFER), cash)).toBe(false)
  })

  it('"Sin especificar" matchea los gastos sin medio de pago, y sólo esos', () => {
    const unspecified = { query: '', method: PAYMENT_METHOD_UNSPECIFIED }

    expect(matchesExpenseFilters(expense('Alquiler', null), unspecified)).toBe(true)
    expect(matchesExpenseFilters(expense('Agua', PAYMENT_CASH), unspecified)).toBe(false)
  })

  it('un gasto sin medio de pago no cae en Efectivo ni en Transferencia', () => {
    // Si cayera en alguno, los KPIs y la tabla contarían cosas distintas.
    expect(
      matchesExpenseFilters(expense('Alquiler', null), { query: '', method: PAYMENT_CASH })
    ).toBe(false)
    expect(
      matchesExpenseFilters(expense('Alquiler', null), { query: '', method: PAYMENT_TRANSFER })
    ).toBe(false)
  })
})

describe('matchesExpenseFilters · búsqueda', () => {
  it('busca por coincidencia parcial y sin distinguir mayúsculas', () => {
    const f = { query: 'agu', method: null }

    expect(matchesExpenseFilters(expense('Bidones de AGUA', null), f)).toBe(true)
    expect(matchesExpenseFilters(expense('Luz', null), f)).toBe(false)
  })

  it('ignora los acentos en los dos sentidos', () => {
    // El operador escribe "maquina" y el gasto dice "Máquina", o al revés.
    expect(
      matchesExpenseFilters(expense('Máquina de correr', null), { query: 'maquina', method: null })
    ).toBe(true)
    expect(
      matchesExpenseFilters(expense('Maquina de correr', null), { query: 'máquina', method: null })
    ).toBe(true)
  })

  it('espacios sueltos no filtran nada', () => {
    expect(matchesExpenseFilters(expense('Luz', null), { query: '   ', method: null })).toBe(true)
  })

  it('el texto y el método se combinan con AND', () => {
    const f = { query: 'agua', method: PAYMENT_CASH }

    expect(matchesExpenseFilters(expense('Agua', PAYMENT_CASH), f)).toBe(true)
    expect(matchesExpenseFilters(expense('Agua', PAYMENT_TRANSFER), f)).toBe(false)
    expect(matchesExpenseFilters(expense('Luz', PAYMENT_CASH), f)).toBe(false)
  })
})

describe('parseExpenseFilters · rango de fechas', () => {
  const now = utcInstantAtAppTzWallClock(2026, 9, 15, 12)

  it('sin params cae en el mes AR en curso', () => {
    expect(parseExpenseFilters({}, now)).toMatchObject({ from: '2026-09-01', to: '2026-09-30' })
  })

  it('el día 1 a la medianoche AR sigue dando el mes en curso, no el anterior', () => {
    // Calculado en UTC, ese instante es el día anterior y el rango arrancaría
    // en agosto. Es el bug de canonicalización aplicado al filtro.
    const firstAtMidnight = utcInstantAtAppTzWallClock(2026, 9, 1, 0)

    expect(getDefaultExpenseRange(firstAtMidnight)).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
    })
  })

  it('una fecha con formato inválido cae al default en vez de vaciar la lista', () => {
    expect(parseExpenseFilters({ from: '2026-13-45' }, now).from).toBe('2026-09-01')
  })

  it('un rango dado vuelta se ordena en vez de devolver cero filas', () => {
    expect(parseExpenseFilters({ from: '2026-09-20', to: '2026-09-05' }, now)).toMatchObject({
      from: '2026-09-05',
      to: '2026-09-20',
    })
  })

  it('un método que no existe no filtra', () => {
    expect(parseExpenseFilters({ method: 'PAYMENT_CRYPTO' }, now).method).toBeNull()
  })

  it('"Sin especificar" es un valor válido del filtro', () => {
    expect(parseExpenseFilters({ method: PAYMENT_METHOD_UNSPECIFIED }, now).method).toBe(
      PAYMENT_METHOD_UNSPECIFIED
    )
  })
})
