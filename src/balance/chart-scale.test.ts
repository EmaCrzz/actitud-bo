import { describe, it, expect } from 'vitest'
import { buildYScale, scaleHeight } from './chart-scale'

describe('buildYScale', () => {
  it('redondea el máximo a un paso limpio por encima del dato más alto', () => {
    // Los ingresos reales de prod de septiembre 2026.
    const scale = buildYScale([2309500, 580630, 1934400])

    expect(scale.max).toBe(2500000)
    expect(scale.ticks).toEqual([0, 500000, 1000000, 1500000, 2000000, 2500000])
  })

  it('el máximo nunca queda por debajo del dato: ninguna barra se sale del plot', () => {
    for (const value of [1, 7, 99, 101, 999, 1001, 123456, 2309500]) {
      expect(buildYScale([value]).max).toBeGreaterThanOrEqual(value)
    }
  })

  it('sin datos devuelve un eje válido, no un max 0 que daría alturas NaN', () => {
    const scale = buildYScale([0, 0])

    expect(scale.max).toBeGreaterThan(0)
    expect(scaleHeight(0, scale, 180)).toBe(0)
  })

  it('las alturas son proporcionales y nunca negativas', () => {
    const scale = buildYScale([1000])

    expect(scaleHeight(scale.max, scale, 180)).toBe(180)
    expect(scaleHeight(scale.max / 2, scale, 180)).toBe(90)
    expect(scaleHeight(-50, scale, 180)).toBe(0)
  })
})
