'use client'

import type { CustomerProfile } from '@/customer/types'
import { formatDate } from '@/lib/format-date'
import { formatPersonId } from '@/lib/format-person-id'
import { useTranslations } from '@/lib/i18n/context'
import { parseAppTzDateString } from '@/lib/timezone'

/**
 * Tab "Info" del Perfil del cliente: datos personales + observaciones.
 *
 * Es sólo lectura. El Figma no dibuja un botón de guardar en el footer del panel
 * (sólo `Cancelar` y `Renovar`), así que editar el cliente no forma parte de
 * este flow.
 */
export default function CustomerProfileInfo({ profile }: { profile: CustomerProfile }) {
  const { t } = useTranslations()
  const empty = t('v2.customers.profile.info.empty')

  return (
    <div className='flex flex-col gap-4'>
      <section className='rounded-lg border p-4'>
        <h3 className='text-sm font-semibold'>{t('v2.customers.profile.info.personalData')}</h3>
        <dl className='mt-3 flex flex-col'>
          <InfoRow
            label={t('v2.customers.profile.info.fullName')}
            value={`${profile.first_name} ${profile.last_name}`.trim() || empty}
          />
          <InfoRow
            label={t('v2.customers.profile.info.personId')}
            value={profile.person_id ? formatPersonId(profile.person_id) : empty}
          />
          <InfoRow
            label={t('v2.customers.profile.info.birthDate')}
            value={formatBirthDate(profile.birth_date) ?? empty}
          />
          <InfoRow label={t('v2.customers.profile.info.phone')} value={profile.phone || empty} />
        </dl>
      </section>

      <section className='flex flex-col gap-2'>
        <h3 className='text-sm font-semibold'>{t('v2.customers.profile.info.notes')}</h3>
        <p className='min-h-16 rounded-lg border px-3 py-2 text-sm whitespace-pre-line text-muted-foreground'>
          {profile.notes?.trim() || t('v2.customers.profile.info.noNotes')}
        </p>
      </section>
    </div>
  )
}

// Sub-componentes

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex items-center justify-between gap-3 border-b py-2.5 text-sm last:border-b-0'>
      <dt className='shrink-0 text-muted-foreground'>{label}</dt>
      <dd className='truncate text-right font-medium'>{value}</dd>
    </div>
  )
}

// Helpers

/**
 * `customers.birth_date` es una columna `date`, así que Supabase la devuelve
 * como `"YYYY-MM-DD"` pelado. Pasarla directo a `formatDate` la haría parsear
 * como medianoche **UTC**, que en Argentina es las 21hs del día anterior: un
 * nacimiento del 12/03 se mostraría como 11/03. `parseAppTzDateString` la ancla
 * a medianoche AR primero, que es la regla de fechas del proyecto.
 */
function formatBirthDate(birthDate: string | null): string | null {
  if (!birthDate) return null

  return formatDate(parseAppTzDateString(birthDate.slice(0, 10)))
}
