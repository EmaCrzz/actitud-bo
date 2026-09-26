import { parsePageParam, readParam, type RawSearchParams } from '@/lib/search-params'

/**
 * Query params de la sección Asistencias.
 *
 * `date` lo interpreta `resolveAssistanceDate` en `date-range.ts`, porque su
 * validación es de calendario y la comparte con la pantalla de v1. Los otros
 * dos son de esta pantalla nada más.
 */
export const ATTENDANCE_PARAM = {
  date: 'date',
  query: 'q',
  page: 'page',
} as const

export interface AttendanceViewParams {
  /** Día visible, "YYYY-MM-DD" en AR. Se omite de la URL cuando es hoy. */
  date?: string | null
  /** Texto del buscador. */
  query?: string
  /** Página 0-indexed. */
  page?: number
}

/** Texto del buscador leído de `?q=`. */
export function parseAttendanceQuery(params: RawSearchParams): string {
  return readParam(params, ATTENDANCE_PARAM.query) ?? ''
}

/** Página 0-indexed leída de `?page=` (que va 1-indexed en la URL). */
export function parseAttendancePage(params: RawSearchParams): number {
  return parsePageParam(params, ATTENDANCE_PARAM.page)
}

/**
 * Serializa el estado de la vista a query string.
 *
 * Omite todo lo que esté en su valor por defecto, para que la URL de la vista
 * normal siga siendo `/v2/attendance` pelada — que es la que distingue el tab
 * "Registro diario" del "Historial".
 */
export function attendanceParamsToQueryString({
  date,
  query,
  page = 0,
}: AttendanceViewParams): string {
  const params = new URLSearchParams()

  if (date) params.set(ATTENDANCE_PARAM.date, date)
  if (query?.trim()) params.set(ATTENDANCE_PARAM.query, query.trim())
  // 1-indexed en la URL: es el número que el usuario ve en el paginador.
  if (page > 0) params.set(ATTENDANCE_PARAM.page, String(page + 1))

  return params.toString()
}
