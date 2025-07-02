"use client"

// Utilidades para manejo de fechas y zonas horarias

/**
 * Detecta si una fecha es "solo fecha" (medianoche UTC)
 */
function isDateOnly(utcDateString: string): boolean {
  const date = new Date(utcDateString)

  return date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0
}

/**
 * Convierte una fecha UTC de Supabase a la zona horaria local
 * Si es una fecha "solo fecha", no hace conversión de zona horaria
 */
export function formatToLocalTime(utcDateString: string): string {
  const date = new Date(utcDateString)

  // Si es solo fecha (medianoche UTC), usar la fecha tal como está
  if (isDateOnly(utcDateString)) {
    return (
      date.toLocaleDateString("es-AR", {
        timeZone: "UTC",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    )
  }

  // Para fechas con hora específica, hacer conversión normal
  return date.toLocaleString("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  })
}

/**
 * Convierte a una zona horaria específica
 * Si es solo fecha, no hace conversión de zona horaria
 */
export function formatToTimezone(utcDateString: string, timezone = "America/Argentina/Buenos_Aires"): string {
  const date = new Date(utcDateString)

  // Si es solo fecha (medianoche UTC), usar la fecha tal como está
  if (isDateOnly(utcDateString)) {
    return date.toLocaleDateString("es-AR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  }

  return date.toLocaleString("es-AR", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

/**
 * Formato personalizado para mostrar solo fecha
 * Maneja correctamente las fechas "solo fecha"
 */
export function formatDateOnly(utcDateString: string): string {
  const date = new Date(utcDateString)

  // Si es solo fecha (medianoche UTC), usar UTC para evitar cambio de día
  if (isDateOnly(utcDateString)) {
    return date.toLocaleDateString("es-AR", {
      timeZone: "UTC",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Para fechas con hora, usar zona horaria local
  return date.toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/**
 * Formato personalizado para mostrar solo dia y mes
 */
export function formatShortDate(utcDateString: string): string {
  const date = new Date(utcDateString)

  // Si es solo fecha (medianoche UTC), usar UTC para evitar cambio de día
  if (isDateOnly(utcDateString)) {
    return date.toLocaleDateString("es-AR", {
      timeZone: "UTC",
      month: "numeric",
      day: "numeric",
    })
  }

  // Para fechas con hora, usar zona horaria local
  return date.toLocaleDateString("es-AR", {
    month: "numeric",
    day: "numeric",
  })
}

/**
 * Formato personalizado para mostrar solo hora
 */
export function formatTimeOnly(utcDateString: string): string {
  const date = new Date(utcDateString)

  // Si es solo fecha, mostrar 00:00
  if (isDateOnly(utcDateString)) {
    return "00:00"
  }

  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Formato relativo (hace X tiempo)
 */
export function formatRelativeTime(utcDateString: string): string {
  const date = new Date(utcDateString)
  const now = new Date()

  // Para fechas "solo fecha", comparar solo las fechas
  if (isDateOnly(utcDateString)) {
    const dateOnly = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const diffInDays = Math.floor((nowOnly.getTime() - dateOnly.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return "Hoy"
    if (diffInDays === 1) return "Ayer"
    if (diffInDays < 7) return `Hace ${diffInDays} días`

    return formatDateOnly(utcDateString)
  }

  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return "Hace menos de un minuto"
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)

    return `Hace ${minutes} minuto${minutes > 1 ? "s" : ""}`
  } else if (diffInSeconds < 86400) {
    return formatTimeOnly(utcDateString)
  } else {
    return formatToTimezone(utcDateString)
  }
}

/**
 * Convierte fecha local a UTC para enviar a Supabase
 */
export function toUTCString(localDate: Date): string {
  return localDate.toISOString()
}

/**
 * Crea una fecha "solo fecha" en UTC (medianoche)
 */
export function createDateOnlyUTC(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))

  return date.toISOString()
}

/**
 * Obtiene la fecha actual en formato UTC para Supabase
 */
export function getCurrentUTCString(): string {
  return new Date().toISOString()
}

/**
 * Obtiene solo la fecha actual (medianoche UTC)
 */
export function getCurrentDateOnlyUTC(): string {
  const now = new Date()

  return createDateOnlyUTC(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

interface DateDisplayProps {
  date: string
  format?: "full" | "date" | "time" | "relative" | "short"
  className?: string
}

export function DateDisplay({ date, format = "full", className }: DateDisplayProps) {
  const formatDate = () => {
    switch (format) {
      case "date":
        return formatDateOnly(date)
      case "time":
        return formatTimeOnly(date)
      case "relative":
        return formatRelativeTime(date)
      case "short":
        return formatShortDate(date)
      default:
        return formatToLocalTime(date)
    }
  }

  return (
    <span className={className} title={formatToLocalTime(date)}>
      {formatDate()}
    </span>
  )
}
