/**
 * Escala del eje Y de "Evolución": un máximo redondo y ticks limpios
 * (0 · 500 mil · 1 M · 1,5 M · 2 M), no los valores crudos de los datos.
 *
 * Pura y separada del componente para poder fijarla con tests: un eje con
 * ticks en `$ 1.934.400` no se lee, y un máximo igual al dato más alto deja la
 * barra más alta pegada al borde superior sin aire.
 */
export interface YScale {
  max: number
  ticks: number[]
}

const NICE_STEPS = [1, 2, 2.5, 5, 10]

export function buildYScale(values: number[], tickCount = 4): YScale {
  const dataMax = Math.max(0, ...values)

  // Sin datos (o todo en cero) igual hace falta un eje: con max 0 todas las
  // alturas serían NaN. Un eje genérico de 0 a 1 deja las barras en el piso.
  if (dataMax === 0) return { max: 1, ticks: [0] }

  // De los pasos redondos, el que da **el máximo más ajustado** con hasta
  // `tickCount + 1` intervalos. Exigir `paso >= dato / tickCount` —la primera
  // versión— descartaba pasos buenos: con $2.309.500 saltaba de 500 mil a 1 M
  // y el eje iba hasta 3 M, con la barra más alta al 77% del alto. Así llega a
  // 2,5 M. Lo encontró su propio test.
  const magnitude = 10 ** Math.floor(Math.log10(dataMax / tickCount))
  const candidates = [...NICE_STEPS, 20]
    .map((nice) => nice * magnitude)
    .map((step) => ({ step, intervals: Math.ceil(dataMax / step) }))
    .filter(({ intervals }) => intervals <= tickCount + 1)
  const { step } = candidates.reduce((best, candidate) =>
    candidate.step * candidate.intervals < best.step * best.intervals ? candidate : best
  )
  const max = Math.ceil(dataMax / step) * step

  return {
    max,
    ticks: Array.from({ length: Math.round(max / step) + 1 }, (_, index) => index * step),
  }
}

/** Altura en px de un valor sobre la escala. Nunca negativa. */
export function scaleHeight(value: number, scale: YScale, plotHeight: number): number {
  return Math.max(0, (value / scale.max) * plotHeight)
}
