// Timezone canónica del negocio. Todas las decisiones sobre "hoy",
// "este mes" o "misma fecha" se resuelven en esta zona, independientemente
// de la zona del servidor (Vercel = UTC) o del navegador del usuario.
export const APP_TIMEZONE = 'America/Argentina/Buenos_Aires'

type DateTimeParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function getPartsInAppTz(date: Date): DateTimeParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0)

  const hour = get('hour')

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    // Chromium reporta hour '24' para medianoche en algunos locales; normalizar.
    hour: hour === 24 ? 0 : hour,
    minute: get('minute'),
    second: get('second'),
  }
}

// Fecha (año/mes/día) tal como se ve en APP_TIMEZONE en el instante dado.
export function getAppTzDateParts(date: Date = new Date()): {
  year: number
  month: number
  day: number
} {
  const { year, month, day } = getPartsInAppTz(date)

  return { year, month, day }
}

// Convierte un wall-clock (año/mes/día/hora) en APP_TIMEZONE al instante UTC equivalente.
// Robusto ante DST: mide el offset observado y lo aplica en un solo paso.
function utcInstantAtAppTzWallClock(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
): Date {
  const target = Date.UTC(year, month - 1, day, hour, minute, second)
  const observed = getPartsInAppTz(new Date(target))
  const observedAsUTC = Date.UTC(
    observed.year,
    observed.month - 1,
    observed.day,
    observed.hour,
    observed.minute,
    observed.second
  )
  const offset = target - observedAsUTC

  return new Date(target + offset)
}

// Rango [start, end) del día actual expresado en UTC, con corte a las 00:00 de APP_TIMEZONE.
export function getTodayRangeInAppTz(now: Date = new Date()): { start: Date; end: Date } {
  const { year, month, day } = getAppTzDateParts(now)

  return {
    start: utcInstantAtAppTzWallClock(year, month, day, 0, 0, 0),
    end: utcInstantAtAppTzWallClock(year, month, day + 1, 0, 0, 0),
  }
}

// Rango [start, end) del día del `date` dado, con corte a las 00:00 de APP_TIMEZONE.
export function getDayRangeInAppTz(date: Date): { start: Date; end: Date } {
  const { year, month, day } = getAppTzDateParts(date)

  return {
    start: utcInstantAtAppTzWallClock(year, month, day, 0, 0, 0),
    end: utcInstantAtAppTzWallClock(year, month, day + 1, 0, 0, 0),
  }
}

// Rango [start, end) del mes actual expresado en UTC, con corte a las 00:00 de APP_TIMEZONE.
export function getMonthRangeInAppTz(now: Date = new Date()): { start: Date; end: Date } {
  const { year, month } = getAppTzDateParts(now)

  return {
    start: utcInstantAtAppTzWallClock(year, month, 1, 0, 0, 0),
    end: utcInstantAtAppTzWallClock(year, month + 1, 1, 0, 0, 0),
  }
}

// Rango [start, end) de la semana lunes→lunes que contiene al instante dado, en APP_TIMEZONE.
export function getWeekRangeInAppTz(now: Date = new Date()): { start: Date; end: Date } {
  const { year, month, day } = getAppTzDateParts(now)
  // Usar UTC como calendario auxiliar para calcular offset de días al lunes.
  const asUtc = new Date(Date.UTC(year, month - 1, day))
  const dayOfWeek = asUtc.getUTCDay() // 0 = Domingo
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  return {
    start: utcInstantAtAppTzWallClock(year, month, day - daysFromMonday, 0, 0, 0),
    end: utcInstantAtAppTzWallClock(year, month, day - daysFromMonday + 7, 0, 0, 0),
  }
}

// True si `a` y `b` caen en el mismo día calendario en APP_TIMEZONE.
export function isSameDayInAppTz(a: Date | string, b: Date | string): boolean {
  const aDate = typeof a === 'string' ? new Date(a) : a
  const bDate = typeof b === 'string' ? new Date(b) : b
  const ap = getAppTzDateParts(aDate)
  const bp = getAppTzDateParts(bDate)

  return ap.year === bp.year && ap.month === bp.month && ap.day === bp.day
}

// True si el día calendario de `expiration` (en APP_TIMEZONE) es estrictamente anterior al día de `now`.
export function isExpiredInAppTz(
  expiration: Date | string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!expiration) return true
  const exp = typeof expiration === 'string' ? new Date(expiration) : expiration
  const expParts = getAppTzDateParts(exp)
  const nowParts = getAppTzDateParts(now)
  const expKey = expParts.year * 10000 + expParts.month * 100 + expParts.day
  const nowKey = nowParts.year * 10000 + nowParts.month * 100 + nowParts.day

  return expKey < nowKey
}

// Días calendario entre hoy y `expiration` en APP_TIMEZONE. Positivo = futuro, 0 = hoy, negativo = pasado.
export function daysUntilInAppTz(
  expiration: Date | string,
  now: Date = new Date()
): number {
  const exp = typeof expiration === 'string' ? new Date(expiration) : expiration
  const expParts = getAppTzDateParts(exp)
  const nowParts = getAppTzDateParts(now)
  const expMidnight = Date.UTC(expParts.year, expParts.month - 1, expParts.day)
  const nowMidnight = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day)

  return Math.round((expMidnight - nowMidnight) / (24 * 60 * 60 * 1000))
}
