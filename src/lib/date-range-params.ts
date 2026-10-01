import {
  getMonthRangeInAppTz,
  parseAppTzDateString,
  shiftIsoDateInAppTz,
  toAppTzIsoDate,
} from '@/lib/timezone'
import { readParam, type RawSearchParams } from '@/lib/search-params'

/**
 * Rango de días calendario AR que viaja en la URL de los listados con dos
 * datepickers (Gastos desde la Fase 11, Ventas desde la 12).
 *
 * Nació dentro de `src/expenses/filters.ts` y se mudó acá cuando Ventas
 * necesitó exactamente la misma lectura: copiarla habría dejado dos lugares
 * donde un bug de timezone se arregla en uno solo.
 */
export interface IsoDateRange {
  /** "YYYY-MM-DD" — día AR inicial, inclusive. */
  from: string
  /** "YYYY-MM-DD" — día AR final, inclusive. */
  to: string
}

/**
 * Rango por default: **el mes en curso**, en la TZ del negocio.
 *
 * Se calcula con `getMonthRangeInAppTz`, no con `new Date()`: el server corre
 * en UTC y el primer día del mes calculado ahí se adelanta tres horas, así que
 * el 1 a la medianoche AR caería en el mes anterior.
 *
 * `end` es el arranque exclusivo del mes siguiente, así que el último día del
 * mes se obtiene restándole un día.
 */
export function getDefaultMonthRangeInAppTz(now: Date = new Date()): IsoDateRange {
  const { start, end } = getMonthRangeInAppTz(now)
  const lastDay = new Date(end.getTime() - 1)

  return { from: toAppTzIsoDate(start), to: toAppTzIsoDate(lastDay) }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * ¿Es un día de calendario que existe?
 *
 * El regex solo **no alcanza**, y lo descubrió su propio test: `2026-13-45`
 * tiene la forma correcta, así que pasaba el filtro, y como ordena después de
 * `2026-09-30` disparaba el swap del rango invertido y terminaba mandando a
 * Postgres un mes 13. El round trip por la TZ del negocio descarta también los
 * días que no existen en su mes (`2026-02-30` vuelve como `2026-03-02`).
 */
export function isRealAppTzDate(iso: string): boolean {
  if (!ISO_DATE.test(iso)) return false

  return toAppTzIsoDate(parseAppTzDateString(iso)) === iso
}

/**
 * Lee `from`/`to` de los searchParams.
 *
 * Las fechas caen al mes en curso si faltan o no son días reales — ver
 * `isRealAppTzDate`. Un rango inválido que pasara silencioso listaría cero
 * filas con cara de "no hay nada cargado", o directamente rompería la query.
 *
 * Un rango dado vuelta (`from` posterior a `to`) devolvería cero filas sin
 * decir por qué. Se ordena en vez de vaciarse: es lo que el operador quiso.
 */
export function parseDateRangeParams(
  params: RawSearchParams,
  keys: { from: string; to: string },
  now: Date = new Date()
): IsoDateRange {
  const fallback = getDefaultMonthRangeInAppTz(now)
  const rawFrom = readParam(params, keys.from)
  const rawTo = readParam(params, keys.to)

  const from = rawFrom && isRealAppTzDate(rawFrom) ? rawFrom : fallback.from
  const to = rawTo && isRealAppTzDate(rawTo) ? rawTo : fallback.to

  return from > to ? { from: to, to: from } : { from, to }
}

/**
 * Serializa los filtros de un listado con rango (sin `?`): búsqueda, rango,
 * método y página. La forma es la misma en Gastos y Ventas; cambian los
 * nombres de los params, que vienen en `keys`.
 */
export function rangeListFiltersToQueryString(
  filters: IsoDateRange & { query: string; method: string | null },
  page: number,
  keys: { query: string; from: string; to: string; method: string; page: string }
): string {
  const params = new URLSearchParams()

  if (filters.query.trim()) params.set(keys.query, filters.query.trim())
  params.set(keys.from, filters.from)
  params.set(keys.to, filters.to)
  if (filters.method) params.set(keys.method, filters.method)
  // En la URL la página es 1-indexed, que es la que ve el operador.
  if (page > 0) params.set(keys.page, String(page + 1))

  return params.toString()
}

/**
 * Los límites de la query para un rango de días AR: `>= gte` y `< lt`.
 *
 * Los dos strings vienen crudos del datepicker y **se canonicalizan acá**:
 * mandarlos tal cual haría que Postgres los lea como midnight UTC, o sea 21:00
 * del día anterior en AR, y el rango arrancaría y terminaría tres horas antes
 * de lo que dice la pantalla. El tope es el **arranque del día siguiente**
 * —exclusivo— con la misma forma que `getMonthRangeInAppTz`, para que el día
 * `to` entre completo.
 */
export function toAppTzQueryBounds(range: Partial<IsoDateRange>): { gte?: string; lt?: string } {
  return {
    gte: range.from ? parseAppTzDateString(range.from).toISOString() : undefined,
    lt: range.to ? parseAppTzDateString(shiftIsoDateInAppTz(range.to, 1)).toISOString() : undefined,
  }
}
