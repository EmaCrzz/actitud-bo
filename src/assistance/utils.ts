import { isSameDayInAppTz } from '@/lib/timezone'

export interface WeekAssistance {
  assistance_date: string
}

/**
 * Filas por página en la sección Asistencias de v2.
 *
 * La paginación es puramente visual: la página ya trae el día entero, así que
 * esto sólo decide cuántas filas se pintan por vez.
 *
 * Vive acá y no en el componente porque también la consumen los specs e2e, que
 * corren en Node: importarla desde un módulo `'use client'` les arrastraría
 * React y `next/navigation`.
 */
export const ATTENDANCE_PAGE_SIZE = 10

/**
 * Membresía embebida en la fila de asistencia.
 *
 * `customer_membership.customer_id` es UNIQUE, así que Supabase resuelve la
 * relación como objeto — pero la normalización cubre igual el array, por el
 * mismo motivo que documenta `mapCustomerRow`: el shape depende de cómo
 * PostgREST interprete la relación, no de lo que pida el select.
 */
interface EmbeddedAssistanceMembership {
  membership_type: string | null
}

/**
 * Fila de asistencia con su cliente, tal como la devuelve `getAssistancesByDate`.
 *
 * Vive acá y no en `api/server.ts` **a propósito**: los componentes de la
 * sección Asistencias de v2 son client components, y aunque un `import type` se
 * borre en compilación, importar desde el módulo del server arrastra a
 * `getAssistanceMembershipType` con él — y con ella `next/headers`, que revienta
 * el build. Este archivo sólo depende de `@/lib/timezone`, así que es seguro
 * desde los dos lados.
 */
export interface AssistanceByDate {
  id: string
  assistance_date: string
  customers: {
    first_name: string
    last_name: string
    person_id: string
    phone: string | null
    email: string | null
    id: string
    customer_membership?: EmbeddedAssistanceMembership | EmbeddedAssistanceMembership[] | null
  }
}

/**
 * Plan vigente del cliente de una fila de asistencia, o `null` si no tiene.
 *
 * Es la línea secundaria de cada fila en la sección Asistencias de v2 ("5
 * días"). El valor es la key del catálogo, no un texto: la traduce
 * `MembershipTranslation`, igual que el listado de clientes.
 */
export function getAssistanceMembershipType(assistance: AssistanceByDate): string | null {
  const embedded = assistance.customers.customer_membership
  const membership = Array.isArray(embedded) ? (embedded[0] ?? null) : (embedded ?? null)

  return membership?.membership_type ?? null
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
