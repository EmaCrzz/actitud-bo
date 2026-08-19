import { APP_TIMEZONE, getAppTzDateParts, parseAppTzDateString } from './timezone'

export interface FormatDateOptions {
  format?: 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd' | 'dd-mm-yyyy' | 'dd/MM/yyyy'
  locale?: string
  timezone?: string
}

export function formatDate(
  date: Date | string,
  { format = 'dd/mm/yyyy', timezone = APP_TIMEZONE }: FormatDateOptions = {}
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date provided')
  }

  // Extraer partes en la TZ solicitada (por default AR). Usar getDate/getMonth
  // sin TZ explícita mostraba el día equivocado cuando el server corría en UTC
  // y el timestamp venía cerca de medianoche AR.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(dateObj)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''

  const day = get('day')
  const month = get('month')
  const year = get('year')

  switch (format) {
    case 'dd/mm/yyyy':
      return `${day}/${month}/${year}`
    case 'mm/dd/yyyy':
      return `${month}/${day}/${year}`
    case 'yyyy-mm-dd':
      return `${year}-${month}-${day}`
    case 'dd-mm-yyyy':
      return `${day}-${month}-${year}`
    case 'dd/MM/yyyy':
      return `${day}/${month}/${year}`
    default:
      return `${day}/${month}/${year}`
  }
}

// Formatea un valor de FECHA DE CALENDARIO ("YYYY-MM-DD", o un timestamp cuya
// parte de fecha es la relevante) como "dd/mm/yyyy" SIN conversión de timezone.
// Para columnas de fecha-solo (ej. expenses.expense_date): `new Date("YYYY-MM-DD")`
// se interpreta como medianoche UTC y `formatDate` (que convierte a AR) mostraría
// el día anterior. Acá tomamos el día calendario tal cual se guardó.
export function formatCalendarDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-')

  return `${day}/${month}/${year}`
}

/**
 * Get current month in YYYY-MM format en la TZ del negocio (Argentina).
 * @returns Current month string (e.g., '2025-10')
 */
export function getCurrentMonth(): string {
  const { year, month } = getAppTzDateParts()

  return `${year}-${String(month).padStart(2, '0')}`
}

// Formatea un "YYYY-MM-DD" como "lunes 7 de julio" en la TZ del negocio.
// Usado por el selector de día de /assistances.
export function formatLongDayInAppTz(isoDate: string, locale = 'es-AR'): string {
  const date = parseAppTzDateString(isoDate)

  return new Intl.DateTimeFormat(locale, {
    timeZone: APP_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

// Formatea un Date como "Lunes 19" (weekday capitalizado + día) en la TZ del negocio.
export function formatDayLabelInAppTz(date: Date): string {
  const parts = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: '2-digit',
    timeZone: APP_TIMEZONE,
  }).formatToParts(date)
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? ''
  const day = parts.find((p) => p.type === 'day')?.value ?? ''

  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${day}`
}

// Formatea un timestamp UTC como "HH:MM" en la TZ del negocio.
export function formatTimeInAppTz(utcIso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(utcIso))
}
