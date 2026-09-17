import { TranslationKey } from '@/lib/i18n/types'

/**
 * Ventana para considerar una membresía "próxima a vencer", en días calendario
 * de Argentina.
 *
 * Vivía en `home/consts.ts` cuando su único consumidor era el subtítulo del
 * MetricCard "Clientes activos del mes". Desde la Fase 6b también la usa el
 * estado "Por vencer" del listado de clientes — el filtro server-side y el badge
 * de la fila — así que se mudó al dominio al que pertenece el concepto. Dos
 * dominios leyendo el mismo umbral tienen que leerlo del mismo lugar: si se
 * desincronizan, el home y el listado contarían distinto y nadie lo notaría.
 */
export const UPCOMING_EXPIRATION_WINDOW_DAYS = 7

export const MEMBERSHIP_TYPE_5_DAYS = 'MEMBERSHIP_TYPE_5_DAYS' as const
export const MEMBERSHIP_TYPE_3_DAYS = 'MEMBERSHIP_TYPE_3_DAYS' as const
export const MEMBERSHIP_TYPE_2_DAYS = 'MEMBERSHIP_TYPE_2_DAYS' as const
export const MEMBERSHIP_TYPE_DAILY = 'MEMBERSHIP_TYPE_DAILY' as const
export const MEMBERSHIP_TYPE_VIP = 'MEMBERSHIP_TYPE_VIP' as const
export const PENDING_PAYMENT = 'PENDING_PAYMENT' as const
export const MembershipTypeArray = [
  MEMBERSHIP_TYPE_5_DAYS,
  MEMBERSHIP_TYPE_3_DAYS,
  MEMBERSHIP_TYPE_2_DAYS,
  MEMBERSHIP_TYPE_DAILY,
  MEMBERSHIP_TYPE_VIP,
]
export type MembershipTypes =
  | typeof MEMBERSHIP_TYPE_5_DAYS
  | typeof MEMBERSHIP_TYPE_3_DAYS
  | typeof MEMBERSHIP_TYPE_2_DAYS
  | typeof MEMBERSHIP_TYPE_DAILY
  | typeof MEMBERSHIP_TYPE_VIP

export const MembershipTranslation: Record<MembershipTypes, TranslationKey> = {
  [MEMBERSHIP_TYPE_5_DAYS]: 'membership.types.5_days',
  [MEMBERSHIP_TYPE_3_DAYS]: 'membership.types.3_days',
  [MEMBERSHIP_TYPE_2_DAYS]: 'membership.types.2_days',
  [MEMBERSHIP_TYPE_DAILY]: 'membership.types.daily',
  [MEMBERSHIP_TYPE_VIP]: 'membership.types.vip',
}

// Nombre del plan como lo escribe la tabla de clientes del Figma desktop:
// "5 días semanales" (captura del 2026-09-16). Existe además de
// `MembershipTranslation` porque esa trae el prefijo incluido —
// "Membresía: 5 días" — que es justo lo que muestra la **fila mobile**, mientras
// la columna de una tabla ya titulada "Membresía" no lo quiere.
//
// Dos variantes, dos capturas: no es preferencia, cada viewport dice lo suyo.
export const MembershipTranslationWeekly: Record<MembershipTypes, TranslationKey> = {
  [MEMBERSHIP_TYPE_5_DAYS]: 'membership.typesWeekly.5_days',
  [MEMBERSHIP_TYPE_3_DAYS]: 'membership.typesWeekly.3_days',
  [MEMBERSHIP_TYPE_2_DAYS]: 'membership.typesWeekly.2_days',
  [MEMBERSHIP_TYPE_DAILY]: 'membership.typesWeekly.daily',
  [MEMBERSHIP_TYPE_VIP]: 'membership.typesWeekly.vip',
}

// Nombre pelado del plan: "5 días". Lo usa el panel "Perfil del cliente" — la
// card de membresía actual y cada fila del historial de pagos (capturas del
// 2026-09-16) — donde el contexto ya dice que se está hablando de una membresía
// y tanto el prefijo de `MembershipTranslation` ("Membresía: 5 días") como el
// sufijo de `MembershipTranslationWeekly` ("5 días semanales") sobran.
export const MembershipTranslationShort: Record<MembershipTypes, TranslationKey> = {
  [MEMBERSHIP_TYPE_5_DAYS]: 'membership.typesShort.5_days',
  [MEMBERSHIP_TYPE_3_DAYS]: 'membership.typesShort.3_days',
  [MEMBERSHIP_TYPE_2_DAYS]: 'membership.typesShort.2_days',
  [MEMBERSHIP_TYPE_DAILY]: 'membership.typesShort.daily',
  [MEMBERSHIP_TYPE_VIP]: 'membership.typesShort.vip',
}

export const MembershipTranslationTwoLines: Record<
  MembershipTypes,
  Record<string, TranslationKey>
> = {
  [MEMBERSHIP_TYPE_5_DAYS]: {
    one: 'membership.types.twoLines.5_days.line1',
    two: 'membership.types.twoLines.5_days.line2',
  },
  [MEMBERSHIP_TYPE_3_DAYS]: {
    one: 'membership.types.twoLines.3_days.line1',
    two: 'membership.types.twoLines.3_days.line2',
  },
  [MEMBERSHIP_TYPE_2_DAYS]: {
    one: 'membership.types.twoLines.2_days.line1',
    two: 'membership.types.twoLines.2_days.line2',
  },
  [MEMBERSHIP_TYPE_DAILY]: {
    one: 'membership.types.twoLines.daily.line1',
    two: 'membership.types.twoLines.daily.line2',
  },
  [MEMBERSHIP_TYPE_VIP]: {
    one: 'membership.types.twoLines.vip.line1',
    two: 'membership.types.twoLines.vip.line2',
  },
}

export const PAYMENT_CASH = 'PAYMENT_CASH' as const
export const PAYMENT_TRANSFER = 'PAYMENT_TRANSFER' as const

export const PaymentTypeArray = [PAYMENT_CASH, PAYMENT_TRANSFER]

export type PaymentType = typeof PAYMENT_CASH | typeof PAYMENT_TRANSFER

export const PaymentsTranslation: Record<PaymentType, TranslationKey> = {
  [PAYMENT_CASH]: 'payments.cash',
  [PAYMENT_TRANSFER]: 'payments.transfer',
}

// Cuántos días semanales habilita cada tipo de membresía.
// VIP se trata igual que 5 días: acceso ilimitado dentro de la semana.
export const SLOTS_BY_TYPE: Record<MembershipTypes, number> = {
  [MEMBERSHIP_TYPE_VIP]: 5,
  [MEMBERSHIP_TYPE_5_DAYS]: 5,
  [MEMBERSHIP_TYPE_3_DAYS]: 3,
  [MEMBERSHIP_TYPE_2_DAYS]: 2,
  [MEMBERSHIP_TYPE_DAILY]: 1,
}
