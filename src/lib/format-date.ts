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
