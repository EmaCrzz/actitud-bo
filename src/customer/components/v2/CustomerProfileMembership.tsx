'use client'

import StatusBadge from '@/components/v2/ui/StatusBadge'
import type { CustomerProfile } from '@/customer/types'
import { getCustomerMembershipStatus } from '@/customer/utils'
import { formatCurrency } from '@/lib/format-currency'
import { formatDate } from '@/lib/format-date'
import { useTranslations } from '@/lib/i18n/context'
import { daysUntilInAppTz } from '@/lib/timezone'
import { MembershipTranslationShort } from '@/membership/consts'
import { getMembershipPeriodStart } from '@/membership/period'
import { CUSTOMER_STATUS_LABEL, CUSTOMER_STATUS_TONE } from './customer-status'

/**
 * Tab "Membresía" del Perfil del cliente.
 *
 * Card con el plan vigente, la barra de progreso del período y tres datos al
 * pie: precio, vencimiento y asistencias acumuladas (capturas del 2026-09-16).
 */
export default function CustomerProfileMembership({ profile }: { profile: CustomerProfile }) {
  const { t } = useTranslations()
  const status = getCustomerMembershipStatus(profile)

  if (!profile.membership_type) {
    return <p className='text-sm text-muted-foreground'>{t('v2.customers.profile.membership.none')}</p>
  }

  const period = getPeriodProgress(profile, t)

  return (
    <div className='rounded-lg border p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div className='flex flex-col gap-1'>
          <span className='text-sm text-muted-foreground'>
            {t('v2.customers.profile.membership.current')}
          </span>
          <span className='text-lg font-semibold'>
            {t(MembershipTranslationShort[profile.membership_type])}
          </span>
        </div>
        <StatusBadge tone={CUSTOMER_STATUS_TONE[status]}>
          {t(CUSTOMER_STATUS_LABEL[status])}
        </StatusBadge>
      </div>

      {period && (
        <div className='mt-4 flex flex-col gap-2'>
          <div className='flex items-baseline justify-between gap-3 text-sm'>
            <span className='text-muted-foreground'>
              {t('v2.customers.profile.membership.progress')}
            </span>
            <span className='font-medium'>{period.label}</span>
          </div>
          {/* Barra simple: no hay primitive de progress en el proyecto y esto no
              justifica agregar una dependencia. `aria-*` la hace legible igual. */}
          <div
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.round(period.percent * 100)}
            className='h-1.5 w-full overflow-hidden rounded-full bg-muted'
            role='progressbar'
          >
            <div
              className='h-full rounded-full bg-foreground transition-[width]'
              style={{ width: `${period.percent * 100}%` }}
            />
          </div>
        </div>
      )}

      <dl className='mt-4 grid grid-cols-3 gap-3 border-t pt-4 text-sm'>
        <Fact
          label={t('v2.customers.profile.membership.price')}
          value={
            profile.membership_amount === null
              ? t('v2.customers.profile.info.empty')
              : formatCurrency(profile.membership_amount)
          }
        />
        <Fact
          label={t('v2.customers.profile.membership.expires')}
          value={
            profile.expiration_date
              ? formatDate(profile.expiration_date)
              : t('v2.customers.profile.info.empty')
          }
        />
        <Fact
          label={t('v2.customers.profile.membership.assistances')}
          value={String(profile.assistance_count)}
        />
      </dl>
    </div>
  )
}

// Sub-componentes

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex min-w-0 flex-col gap-0.5'>
      <dt className='text-muted-foreground'>{label}</dt>
      <dd className='truncate font-medium'>{value}</dd>
    </div>
  )
}

// Helpers

interface PeriodProgress {
  /** 0..1 — cuánto del período transcurrió. */
  percent: number
  label: string
}

/**
 * Progreso del período de la membresía.
 *
 * El inicio del período sale de `getMembershipPeriodStart()`, que prefiere
 * `start_date` (brecha B12, cerrada en la Fase 7) y cae a `last_payment_date`
 * para el histórico anterior, que se migró sin backfill. El fallback es una
 * aproximación: coincide con el inicio real siempre que la membresía se haya
 * activado al cobrarla, que es el flujo normal.
 *
 * Devuelve `null` cuando no hay con qué dibujar la barra — sin vencimiento, o
 * sin ninguno de los dos orígenes (VIP) — en vez de inventar un período de largo
 * arbitrario.
 */
function getPeriodProgress(
  profile: CustomerProfile,
  t: ReturnType<typeof useTranslations>['t']
): PeriodProgress | null {
  const { expiration_date: expiration } = profile
  const start = getMembershipPeriodStart(profile)

  if (!expiration) return null

  const remaining = daysUntilInAppTz(expiration)

  if (remaining < 0) {
    return {
      percent: 1,
      label: t('v2.customers.profile.membership.expiredSince', { days: Math.abs(remaining) }),
    }
  }

  const label =
    remaining === 0
      ? t('v2.customers.profile.membership.lastDay')
      : t('v2.customers.profile.membership.daysRemaining', { days: remaining })

  // Sin origen del período (VIP, o alta sin cobro) se muestran los días
  // restantes sin barra llena, en vez de inventar un largo.
  if (!start) return { percent: 0, label }

  const total = daysUntilInAppTz(expiration, new Date(start))
  // Un período de 0 días (pago y vencimiento el mismo día, ej. pase diario) no
  // tiene fracción que mostrar: se considera completo.
  const percent = total <= 0 ? 1 : Math.min(1, Math.max(0, (total - remaining) / total))

  return { percent, label }
}
