// Tipos de grupo soportados hoy. La tabla `customer_groups` tiene un CHECK
// que restringe a estos valores; agregar uno nuevo requiere alterar el
// constraint.
export const GROUP_TYPE_FAMILY = 'family' as const

export type GroupType = typeof GROUP_TYPE_FAMILY

export const GroupTypeArray = [GROUP_TYPE_FAMILY] as const

// `applies_to` de discount_rules — dónde/cómo puede aplicarse una regla.
export const DISCOUNT_APPLIES_TO_GROUP_MEMBER = 'group_member' as const
export const DISCOUNT_APPLIES_TO_MANUAL = 'manual' as const
export const DISCOUNT_APPLIES_TO_PROMO = 'promo' as const

export type DiscountAppliesTo =
  | typeof DISCOUNT_APPLIES_TO_GROUP_MEMBER
  | typeof DISCOUNT_APPLIES_TO_MANUAL
  | typeof DISCOUNT_APPLIES_TO_PROMO

// Tipo de valor de la regla.
export const DISCOUNT_TYPE_FIXED = 'fixed' as const
export const DISCOUNT_TYPE_PERCENT = 'percent' as const

export type DiscountType = typeof DISCOUNT_TYPE_FIXED | typeof DISCOUNT_TYPE_PERCENT

// Mínimo de integrantes activos para poder aplicar el descuento de grupo.
// El "2do integrante familiar" requiere al menos 2 miembros vinculados.
export const GROUP_MIN_MEMBERS_FOR_DISCOUNT = 2
