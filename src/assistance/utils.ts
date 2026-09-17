import { isSameDayInAppTz } from '@/lib/timezone'

export interface WeekAssistance {
  assistance_date: string
}

export interface WeekSlot {
  // La asistencia que consumió este slot, o null si está libre.
  assistance: WeekAssistance | null
  // True para asistencias que exceden los días que habilita la membresía.
  overQuota: boolean
}

// Los slots son contadores de consumo, no días de la semana: el slot N lo ocupa
// la N-ésima asistencia de la semana, sin importar en qué día caiga. Mapear slot
// N → día N (lunes, martes, …) esconde asistencias: un cliente de 3 días que va
// mié/jue/vie tendría slots Lun-Mié y sus visitas de jue y vie no se verían.
//
// Se cuenta un slot por día calendario AR (dos registros el mismo día no
// consumen dos slots). Si hay más asistencias que slots, se devuelven filas
// extra marcadas `overQuota` en vez de descartarlas — el exceso es un dato que
// el staff necesita ver, no ruido a ocultar.
export function buildWeekSlots(count: number, assistances: WeekAssistance[]): WeekSlot[] {
  const byDay = [...assistances]
    .sort((a, b) => a.assistance_date.localeCompare(b.assistance_date))
    .filter(
      (a, i, all) =>
        i === all.findIndex((b) => isSameDayInAppTz(a.assistance_date, b.assistance_date))
    )

  const total = Math.max(count, byDay.length)

  return Array.from({ length: total }, (_, i) => ({
    assistance: byDay[i] ?? null,
    overQuota: i >= count,
  }))
}

/** Código de violación de constraint UNIQUE de Postgres. */
const POSTGRES_UNIQUE_VIOLATION = '23505'

/**
 * True si el error viene de intentar registrar una segunda asistencia del mismo
 * cliente el mismo día calendario argentino.
 *
 * El índice `assistance_one_per_customer_per_day_ar` (migración 20260917120100)
 * es la única garantía real contra el duplicado: las dos UIs deshabilitan el
 * botón cuando ya hay asistencia hoy, pero eso es un check-then-insert y dos
 * requests concurrentes lo atraviesan.
 *
 * Vive acá y no en `api/client.ts` para que la traducción del mensaje quede en
 * la UI: la capa de API no conoce el diccionario de i18n. Los dos consumidores
 * — el modal v2 y la pantalla v1 — eligen entre `alreadyRegisteredToday` y
 * `errorRegistering` con esto.
 */
export function isDuplicateAssistanceError(error: { code?: string } | null): boolean {
  return error?.code === POSTGRES_UNIQUE_VIOLATION
}
