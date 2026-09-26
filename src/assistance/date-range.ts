import { shiftIsoDateInAppTz } from '@/lib/timezone'

/**
 * Ventana máxima hacia atrás en las pantallas de asistencias, en días.
 *
 * Es un límite de producto, no técnico: la consulta es por rango de un día y
 * cuesta lo mismo para cualquier fecha. Vive acá —y no como constante local de
 * una page— porque la usan la pantalla de v1 y la sección de v2, y si cada una
 * tuviera la suya, navegar 14 días en una y 30 en la otra sería un bug que
 * nadie notaría hasta que alguien compare.
 */
export const MAX_ASSISTANCE_DAYS_BACK = 14

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Día más viejo navegable, dado el "hoy" del calendario argentino. */
export function getMinAssistanceDate(todayIso: string): string {
  return shiftIsoDateInAppTz(todayIso, -MAX_ASSISTANCE_DAYS_BACK)
}

export type AssistanceDateResolution =
  /** No vino `?date=`: la pantalla muestra hoy. */
  | { status: 'today' }
  /** Vino `?date=` y apunta a hoy. La v2 lo redirige a la URL sin parámetro. */
  | { status: 'explicitToday' }
  /** Un día pasado dentro de la ventana. */
  | { status: 'day'; date: string }
  /** Mal formado, inexistente, futuro o fuera de la ventana. */
  | { status: 'invalid' }

/**
 * Interpreta el `?date=` de las pantallas de asistencias.
 *
 * Rechaza cuatro cosas distintas con el mismo veredicto: un string que no tiene
 * forma de fecha, un día que no existe en el calendario (`2026-02-31`, que
 * `new Date` aceptaría corriéndolo al 3 de marzo), una fecha futura y una
 * anterior a la ventana. Las comparaciones son entre strings `YYYY-MM-DD`, que
 * ordenan lexicográficamente igual que cronológicamente — y evitan construir
 * `Date` intermedios, que es donde se cuelan los desfases de timezone.
 */
export function resolveAssistanceDate(
  raw: string | null | undefined,
  todayIso: string
): AssistanceDateResolution {
  if (!raw) return { status: 'today' }
  if (!ISO_DATE_RE.test(raw)) return { status: 'invalid' }

  const [year, month, day] = raw.split('-').map(Number)
  const asDate = new Date(Date.UTC(year, month - 1, day))
  const isRealDay =
    asDate.getUTCFullYear() === year &&
    asDate.getUTCMonth() === month - 1 &&
    asDate.getUTCDate() === day

  if (!isRealDay) return { status: 'invalid' }
  if (raw > todayIso) return { status: 'invalid' }
  if (raw < getMinAssistanceDate(todayIso)) return { status: 'invalid' }
  if (raw === todayIso) return { status: 'explicitToday' }

  return { status: 'day', date: raw }
}
