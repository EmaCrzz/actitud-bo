'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from '@/components/v2/ui/Button'
import { formatMonthKey } from '@/lib/format-date'
import { useTranslations } from '@/lib/i18n/context'
import { getIntlLocale } from '@/lib/i18n/locale'
import type { Language } from '@/lib/i18n/types'
import { shiftMonthKey } from '@/lib/month-key'
import { cn } from '@/lib/utils'

interface MonthNavigationProps {
  /** Mes visible, "YYYY-MM". */
  month: string
  /** Mes AR en curso: tope hacia adelante y URL canónica (sin `?month=`). */
  currentMonth: string
  /** Mes del primer movimiento registrado: tope hacia atrás. */
  earliestMonth: string | null
  lang: Language
  /** Navegar a otro mes. La transición la maneja `BalanceSection`. */
  onNavigate: (month: string) => void
  /**
   * Hay una navegación en vuelo. Los botones **no** se bloquean: tres clicks
   * seguidos tienen que llevar tres meses atrás, y gana la última navegación.
   */
  isPending: boolean
  className?: string
}

/**
 * Navegador de mes del Balance (Fase 13): ‹ Septiembre 2026 ›.
 *
 * Reemplaza los dos datepickers del diseño, decisión de Ema el 2026-10-01: la
 * pantalla habla de un **mes** —"resultado del mes", "vs mes anterior", la
 * serie que termina en él— y con un rango libre ninguna de las tres está
 * definida (¿cuál es "el mes anterior" del 15/08 al 20/09?).
 *
 * Misma forma que el `DateNavigation` de Asistencias. Es presentacional: la
 * navegación —y el detalle de que el mes en curso va a la ruta **sin**
 * `?month=`— la hace `BalanceSection`, que es la que tiene que mostrar el
 * skeleton mientras carga.
 */
export default function MonthNavigation({
  month,
  currentMonth,
  earliestMonth,
  lang,
  onNavigate,
  isPending,
  className,
}: MonthNavigationProps) {
  const { t } = useTranslations()

  return (
    <div
      aria-busy={isPending}
      aria-label={t('v2.balance.title')}
      className={cn('flex items-center rounded-lg border', className)}
      role='group'
    >
      <Button
        aria-label={t('v2.balance.month.previous')}
        className='rounded-l-lg rounded-r-none border-r'
        disabled={!earliestMonth || month <= earliestMonth}
        id='balance_month_previous'
        size='icon'
        type='button'
        variant='ghost'
        onClick={() => onNavigate(shiftMonthKey(month, -1))}
      >
        <ChevronLeft className='size-4' />
      </Button>
      <span
        aria-live='polite'
        className='min-w-0 flex-1 truncate px-3 text-center text-sm font-medium sm:min-w-40'
        id='balance_month_label'
      >
        {formatMonthKey(month, getIntlLocale(lang))}
      </span>
      <Button
        aria-label={t('v2.balance.month.next')}
        className='rounded-l-none rounded-r-lg border-l'
        disabled={month >= currentMonth}
        id='balance_month_next'
        size='icon'
        type='button'
        variant='ghost'
        onClick={() => onNavigate(shiftMonthKey(month, 1))}
      >
        <ChevronRight className='size-4' />
      </Button>
    </div>
  )
}
