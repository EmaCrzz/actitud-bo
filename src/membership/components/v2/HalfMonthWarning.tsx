'use client'

import { AlertTriangle } from 'lucide-react'
import { ACTITUD_BILLING_POLICY } from '@/accounting/billing-policy'
import { formatCalendarDate } from '@/lib/format-date'
import { useTranslations } from '@/lib/i18n/context'
import { isHalfMonthOutsidePolicy } from '@/membership/pricing'

interface HalfMonthWarningProps {
  /** Modalidad elegida. Sólo `'half'` puede disparar el aviso. */
  mode: string
  /** "YYYY-MM-DD" de los datepickers. */
  startDate: string
  endDate: string
}

/**
 * Aviso de medio mes elegido antes de lo que la política justifica.
 *
 * Lo comparten la renovación y el alta, que tienen la misma combinación de
 * modalidad + datepickers. **Informa, no bloquea**, igual que el aviso de
 * cambio de plan: puede ser una excepción pactada. Lo que no puede pasar es que
 * un mes casi entero a mitad de precio se registre sin que nadie lo haya leído.
 * Ver `isHalfMonthOutsidePolicy`.
 */
export default function HalfMonthWarning({ mode, startDate, endDate }: HalfMonthWarningProps) {
  const { t } = useTranslations()

  if (!isHalfMonthOutsidePolicy(mode, startDate)) return null

  return (
    <div
      className='border-feedback-warning text-feedback-warning flex items-start gap-2 rounded-lg border px-3 py-2 text-xs'
      id='half_month_warning'
      role='status'
    >
      <AlertTriangle aria-hidden className='mt-0.5 size-4 shrink-0' />
      <span>
        {t('v2.membership.halfMonthWarning', {
          start: formatCalendarDate(startDate),
          end: endDate ? formatCalendarDate(endDate) : '-',
          day: ACTITUD_BILLING_POLICY.halfMonthStart,
        })}
      </span>
    </div>
  )
}
