import type { TranslationKey, TranslationParams } from '@/lib/i18n/types'
import { removeAccents } from '@/lib/utils/text'
import {
  MembershipTranslation,
  MembershipTranslationShort,
  MembershipTranslationTwoLines,
  MembershipTranslationWeekly,
  MembershipTypeArray,
  SLOTS_BY_TYPE,
  type MembershipTypes,
} from './consts'

export type TFn = (key: TranslationKey, params?: TranslationParams) => string

/**
 * Resolución de nombre y cupo semanal para un plan **cualquiera**, del catálogo
 * original o creado desde la UI.
 *
 * Por qué existe (decisión #7 del plan v2, reabierta el 2026-09-28): desde la
 * Fase 10 los planes se crean desde la app, así que `membership_type` ya no es
 * uno de los 5 valores de `MembershipTypes` — es un `string`. Abrir esa unión
 * en todo el código costaba 79 usos en 26 archivos, la mitad en v1.
 *
 * En vez de eso, `MembershipTypes` queda representando lo que realmente es:
 * **los 5 tipos con comportamiento especial** — VIP no se cobra y exige admin,
 * DAILY vence el mismo día, y ambos carecen de modalidades de cobro, todo
 * escrito en los RPCs comparando el string literal. Los planes nuevos son
 * ordinarios y caen en la rama por defecto de ese código; lo único que les
 * falta es nombre y cupo, y de eso se ocupan estas funciones.
 *
 * El patrón no es nuevo: `formatMembershipLabel` y `AssistanceModal` ya hacían
 * esto mismo a mano, cada uno a su manera. Acá queda en un solo lugar.
 */

/**
 * `true` si el tipo es uno de los 5 originales, los que tienen key i18n y
 * comportamiento especial. Es un type guard: adentro del `if`, TypeScript
 * estrecha a `MembershipTypes` y los `Record<MembershipTypes, …>` indexan sin
 * cast.
 */
export function isCatalogMembershipType(type: string): type is MembershipTypes {
  return (MembershipTypeArray as readonly string[]).includes(type)
}

const LABEL_MAPS = {
  /** "Membresía: 5 días" — lleva el prefijo incluido. */
  full: MembershipTranslation,
  /** "5 días semanales" — para la columna de una tabla ya titulada "Membresía". */
  weekly: MembershipTranslationWeekly,
  /** "5 días" — pelado, para contextos que ya hablan de membresías. */
  short: MembershipTranslationShort,
} as const

export type MembershipLabelVariant = keyof typeof LABEL_MAPS

/**
 * Nombre visible de un plan.
 *
 * Los 5 del catálogo resuelven por key i18n, que es lo que veníamos haciendo y
 * lo que permite que el día que se agregue un idioma no haya que migrar datos.
 * Los creados desde la UI no tienen key, así que usan el `name` que guardaron
 * en `types_memberships`.
 *
 * **Esta función es el único camino permitido para etiquetar un plan.**
 * Indexar `MembershipTranslation[type]` directo devuelve `undefined` para un
 * plan fuera del catálogo, y pasarle eso a `t()` **tira la pantalla entera**
 * con `Cannot read properties of undefined (reading 'split')`. No es
 * hipotético: la suite e2e lo detectó en el alta de cliente apenas existió el
 * primer plan creado desde la UI.
 */
export function getMembershipLabel(
  type: string,
  t: TFn,
  { name, variant = 'short' }: { name?: string | null; variant?: MembershipLabelVariant } = {}
): string {
  if (isCatalogMembershipType(type)) return t(LABEL_MAPS[variant][type])

  return name?.trim() || humanizeMembershipTypeKey(type)
}

/**
 * Etiqueta partida en dos líneas: `{ one: '5', two: 'Días por semana' }`.
 *
 * Sólo los 5 del catálogo tienen esa variante en el diccionario. Un plan
 * creado desde la UI no se puede partir —su nombre es una frase libre— así
 * que devuelve todo en `one` y deja `two` vacío. Los call sites concatenan
 * las dos con un espacio, y uno vacío no cambia nada visible.
 */
export function getMembershipTwoLineLabel(
  type: string,
  t: TFn,
  name?: string | null
): { one: string; two: string } {
  if (isCatalogMembershipType(type)) {
    const lines = MembershipTranslationTwoLines[type]

    return { one: t(lines.one), two: t(lines.two) }
  }

  return { one: getMembershipLabel(type, t, { name }), two: '' }
}

/**
 * Reconstruye un nombre legible desde la clave: `PLAN_FAMILIAR_5_DIAS` →
 * `Plan familiar 5 dias`.
 *
 * Es el **último** recurso, para los call sites que tienen el
 * `membership_type` de un cliente o de un pago pero no hicieron el join con
 * `types_memberships` para traerse el `name`. Son la mayoría: las queries de
 * clientes, pagos y asistencias seleccionan la clave y nada más.
 *
 * Es aproximado y conviene saber en qué: `membershipTypeKeyFromName` pierde
 * acentos y mayúsculas, así que "Plan familiar 5 días" vuelve como "Plan
 * familiar 5 dias". **Donde el `name` real esté a mano hay que pasarlo** — el
 * parámetro gana sobre esto.
 */
function humanizeMembershipTypeKey(type: string): string {
  const words = type.toLowerCase().split('_').filter(Boolean)

  if (words.length === 0) return type

  return [words[0].charAt(0).toUpperCase() + words[0].slice(1), ...words.slice(1)].join(' ')
}

/**
 * Días por semana que habilita el plan, o `null` si no se sabe.
 *
 * La columna `weekly_quota` manda; `SLOTS_BY_TYPE` queda como fallback de los 5
 * originales, para que la app siga funcionando entre el deploy del código y la
 * aplicación de la migración (y al revés).
 *
 * **Devuelve `null` en vez de un número por defecto a propósito.** El mapa
 * duplicado que vivía en `CustomerCounter` devolvía `undefined` para un tipo
 * desconocido, y `Array.from({ length: undefined })` da `[]`: la pantalla
 * renderizaba **cero casilleros de asistencia sin ningún error**. Un `null`
 * explícito obliga a cada caller a decidir qué mostrar cuando no sabe.
 */
export function getWeeklySlots(type: string, weeklyQuota?: number | null): number | null {
  if (weeklyQuota != null) return weeklyQuota
  if (isCatalogMembershipType(type)) return SLOTS_BY_TYPE[type]

  return null
}

/**
 * Cuántos casilleros dibujar cuando el cupo del plan no se pudo resolver.
 *
 * 5 es el valor que `AssistanceModal` ya venía usando como fallback inline, y
 * coincide con el tope de días hábiles. Se nombra en vez de repetirlo: es una
 * decisión de presentación —"ante la duda, mostrá la semana completa"— y
 * conviene que se lea como tal en cada call site.
 */
export const DEFAULT_WEEKLY_SLOTS = 5

/**
 * Clave de un plan nuevo, derivada de su nombre: "Plan familiar 5 días" →
 * `PLAN_FAMILIAR_5_DIAS`.
 *
 * El formulario pide un nombre, pero `types_memberships.type` es la columna
 * que referencian las FKs de `customer_membership` y `membership_payments`, y
 * es la que aparece en los `IF p_membership_type = '…'` de los RPCs. O sea que
 * el plan necesita las dos cosas: una clave estable para la DB y un nombre
 * legible para la pantalla.
 *
 * Derivarla del nombre en vez de pedir las dos por separado evita un campo
 * técnico en un formulario que usa el dueño del gimnasio. El costo es que dos
 * nombres distintos pueden colapsar en la misma clave ("Plan Familiar" y "plan
 * familiar"): **eso lo frena el UNIQUE que `type` ya tiene**, y el error se
 * muestra en el formulario. Falla ruidoso, que es lo que queremos.
 *
 * No se le pone prefijo `MEMBERSHIP_TYPE_`: esa forma la tienen los 5
 * originales y conviene poder distinguir de un vistazo, en la DB, cuáles
 * llevan comportamiento especial en el código y cuáles son ordinarios.
 */
export function membershipTypeKeyFromName(name: string): string {
  return removeAccents(name)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}
