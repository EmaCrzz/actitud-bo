import type { TranslationKey, TranslationParams } from '@/lib/i18n/types'
import {
  MEMBERSHIP_TYPE_DAILY,
  MEMBERSHIP_TYPE_VIP,
  MembershipTranslation,
  MembershipTranslationTwoLines,
  type MembershipTypes,
} from '@/membership/consts'

type TFn = (key: TranslationKey, params?: TranslationParams) => string

// Etiqueta legible para un tipo de membresía en el contexto del dashboard.
// - DAILY y VIP usan la versión de una sola línea (concatenar el two-line da
//   "1 Pase diario" o "VIP VIP", que no leen bien).
// - Los tipos por-cantidad-de-días usan el two-line ("3 Días por semana"),
//   más informativo que el single ("Membresía: 3 días") en un card compacto.
export function formatMembershipLabel(type: string, t: TFn): string {
  if (type === MEMBERSHIP_TYPE_DAILY || type === MEMBERSHIP_TYPE_VIP) {
    const single = MembershipTranslation[type as MembershipTypes]

    return single ? t(single) : type
  }

  const two = MembershipTranslationTwoLines[type as MembershipTypes]

  if (two) return `${t(two.one)} ${t(two.two)}`.trim()

  const single = MembershipTranslation[type as MembershipTypes]

  return single ? t(single) : type
}
