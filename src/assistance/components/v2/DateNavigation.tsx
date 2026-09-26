'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Button from '@/components/v2/ui/Button'
import { formatLongDayInAppTz } from '@/lib/format-date'
import { useTranslations } from '@/lib/i18n/context'
import { getIntlLocale } from '@/lib/i18n/locale'
import type { Language } from '@/lib/i18n/types'
import { shiftIsoDateInAppTz } from '@/lib/timezone'
import { cn } from '@/lib/utils'
import { capitalizeFirst } from '@/lib/utils/text'

interface DateNavigationProps {
  /** Día visible, "YYYY-MM-DD" en el calendario de Argentina. */
  currentDate: string
  /** Hoy en AR. Define la etiqueta "Hoy" y la URL canónica (sin `?date=`). */
  todayDate: string
  /** Día más viejo navegable. */
  minDate: string
  /**
   * Día más nuevo navegable.
   *
   * No siempre es hoy: en el tab "Historial" de desktop el tope es **ayer**,
   * porque hoy tiene su propio tab y dejar que el navegador llegue ahí produce
   * la misma lista con el tab equivocado subrayado.
   */
  maxDate: string
  /** Ruta base de la pantalla. El día viaja como `?date=`. */
  basePath: string
  /**
   * Se necesita para `Intl`. Es el mismo motivo por el que lo recibe el
   * `DayNavigator` de v1: `getIntlLocale` es isomorfo, pero el idioma activo
   * sólo lo sabe el server.
   */
  lang: Language
  /**
   * Distingue las dos instancias montadas a la vez — el switch desktop/mobile
   * es por CSS, no por JS, así que ambas existen en el DOM.
   */
  id: string
  className?: string
}

/**
 * Navegador de día de la sección Asistencias v2.
 *
 * Port del `DayNavigator` de v1 ([src/assistance/day-navigator.tsx]). No se
 * reusa aquel porque está pintado con la paleta de v1 (`text-white/80` sobre
 * fondo oscuro), invisible sobre la superficie clara de v2, y porque el Figma
 * lo dibuja como un grupo con borde y divisores en vez de tres controles
 * sueltos. La lógica de navegación sí es la misma, incluido el detalle que
 * importa: al volver a hoy se navega a la ruta **sin** `?date=`, para que no
 * haya dos URLs distintas mostrando el mismo día.
 */
export default function DateNavigation({
  currentDate,
  todayDate,
  minDate,
  maxDate,
  basePath,
  lang,
  id,
  className,
}: DateNavigationProps) {
  const router = useRouter()
  const { t } = useTranslations()

  const isAtMin = currentDate <= minDate
  const isAtMax = currentDate >= maxDate
  const yesterdayIso = shiftIsoDateInAppTz(todayDate, -1)
  const locale = getIntlLocale(lang)

  const label = (() => {
    if (currentDate === todayDate) return t('assistance.dayNavigator.today')
    if (currentDate === yesterdayIso) return t('assistance.dayNavigator.yesterday')

    // `capitalizeFirst` y no la clase `capitalize` de Tailwind: esa capitaliza
    // **cada** palabra, y sobre una fecha larga en español da "Jueves 24 De
    // Septiembre". Acá sólo hay que arrancar la oración en mayúscula.
    return capitalizeFirst(formatLongDayInAppTz(currentDate, locale))
  })()

  const goTo = (iso: string) => {
    router.push(iso === todayDate ? basePath : `${basePath}?date=${iso}`)
  }

  return (
    <div
      aria-label={t('assistance.dayNavigator.ariaLabel')}
      className={cn('flex items-center rounded-lg border', className)}
      id={id}
      role='group'
    >
      <Button
        aria-label={t('assistance.dayNavigator.previousDay')}
        className='rounded-l-lg rounded-r-none border-r'
        disabled={isAtMin}
        size='icon'
        type='button'
        variant='ghost'
        onClick={() => goTo(shiftIsoDateInAppTz(currentDate, -1))}
      >
        <ChevronLeft className='size-4' />
      </Button>
      <span aria-live='polite' className='flex-1 px-3 text-center text-sm'>
        {label}
      </span>
      <Button
        aria-label={t('assistance.dayNavigator.nextDay')}
        className='rounded-l-none rounded-r-lg border-l'
        disabled={isAtMax}
        size='icon'
        type='button'
        variant='ghost'
        onClick={() => goTo(shiftIsoDateInAppTz(currentDate, 1))}
      >
        <ChevronRight className='size-4' />
      </Button>
    </div>
  )
}
