import { describe, it, expect } from 'vitest'
import {
  getCurrentMonthKeyInAppTz,
  getMonthKeyOfInstant,
  getMonthKeysEndingAt,
  isValidMonthKey,
  monthKeyToIsoRange,
  shiftMonthKey,
} from './month-key'
import { utcInstantAtAppTzWallClock } from './timezone'

/**
 * Meses en la TZ del negocio. El caso que justifica el archivo es el borde:
 * el día 1 a la medianoche AR y el último día después de las 21:00 AR, donde
 * un cálculo en UTC da el mes equivocado.
 */
describe('month-key', () => {
  it('el mes en curso es el AR, no el UTC', () => {
    // 1/10 00:30 AR = 1/10 03:30Z (mismo mes); 30/9 22:00 AR = 1/10 01:00Z.
    expect(getCurrentMonthKeyInAppTz(utcInstantAtAppTzWallClock(2026, 10, 1, 0, 30))).toBe('2026-10')
    expect(getCurrentMonthKeyInAppTz(utcInstantAtAppTzWallClock(2026, 9, 30, 22, 0))).toBe('2026-09')
  })

  it('una cuota cobrada el 30/9 a las 22:00 AR es de septiembre', () => {
    expect(getMonthKeyOfInstant('2026-10-01T01:00:00.000Z')).toBe('2026-09')
  })

  it('corre meses cruzando años en las dos direcciones', () => {
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12')
    expect(shiftMonthKey('2025-12', 1)).toBe('2026-01')
    expect(shiftMonthKey('2026-03', -14)).toBe('2025-01')
    expect(shiftMonthKey('2026-03', 0)).toBe('2026-03')
  })

  it('la ventana de N meses termina en el ancla, del más viejo al más nuevo', () => {
    expect(getMonthKeysEndingAt('2026-02', 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
  })

  it('el rango del mes es inclusivo y respeta el largo de cada mes', () => {
    expect(monthKeyToIsoRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(monthKeyToIsoRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' })
    expect(monthKeyToIsoRange('2026-12')).toEqual({ from: '2026-12-01', to: '2026-12-31' })
  })

  it('valida el formato YYYY-MM', () => {
    expect(isValidMonthKey('2026-09')).toBe(true)
    expect(isValidMonthKey('2026-13')).toBe(false)
    expect(isValidMonthKey('2026-9')).toBe(false)
    expect(isValidMonthKey(null)).toBe(false)
  })
})
