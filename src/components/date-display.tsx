"use client"

// Utilidades para manejo de fechas y zonas horarias

/**
 * Convierte una fecha UTC de Supabase a la zona horaria local
 */
export function formatToLocalTime(utcDateString: string): string {
  const date = new Date(utcDateString)

  // Formato básico en zona horaria local
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
 */
export function formatToTimezone(utcDateString: string, timezone = "America/Argentina/Buenos_Aires"): string {
  const date = new Date(utcDateString)

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
 */
export function formatDateOnly(utcDateString: string): string {
  const date = new Date(utcDateString)

  return date.toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/**
 * Formato personalizado para mostrar solo hora
 */
export function formatTimeOnly(utcDateString: string): string {
  const date = new Date(utcDateString)

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
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return "Hace menos de un minuto"
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `Hace ${minutes} minuto${minutes > 1 ? "s" : ""}`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `Hace ${hours} hora${hours > 1 ? "s" : ""}`
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
 * Obtiene la fecha actual en formato UTC para Supabase
 */
export function getCurrentUTCString(): string {
  return new Date().toISOString()
}


interface DateDisplayProps {
  date: string
  format?: "full" | "date" | "time" | "relative"
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
