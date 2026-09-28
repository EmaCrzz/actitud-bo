import { MembershipTranslationTwoLines, MEMBERSHIP_TYPE_DAILY, MEMBERSHIP_TYPE_VIP } from '@/membership/consts'
import { getMembershipLabel, isCatalogMembershipType, type TFn } from '@/membership/catalog'

// Etiqueta legible para un tipo de membresía en el contexto del dashboard.
// - DAILY y VIP usan la versión de una sola línea (concatenar el two-line da
//   "1 Pase diario" o "VIP VIP", que no leen bien).
// - Los tipos por-cantidad-de-días usan el two-line ("3 Días por semana"),
//   más informativo que el single ("Membresía: 3 días") en un card compacto.
//
// Los planes creados desde la UI (Fase 10) no tienen key i18n ni variante de
// dos líneas: resuelven por `name`, que el caller pasa cuando lo tiene. Los
// casts a `MembershipTypes` que esta función hacía a mano se fueron con el
// type guard de `catalog.ts`, que es donde vive ahora ese fallback.
export function formatMembershipLabel(type: string, t: TFn, name?: string | null): string {
  if (!isCatalogMembershipType(type)) return getMembershipLabel(type, t, { name })

  if (type === MEMBERSHIP_TYPE_DAILY || type === MEMBERSHIP_TYPE_VIP) {
    return getMembershipLabel(type, t, { variant: 'full' })
  }

  const two = MembershipTranslationTwoLines[type]

  return `${t(two.one)} ${t(two.two)}`.trim()
}
