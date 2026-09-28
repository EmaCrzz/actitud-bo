import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAssistancesByDateResult } from '@/assistance/api/server'
import AttendanceSection from '@/assistance/components/v2/AttendanceSection'
import { getMinAssistanceDate, resolveAssistanceDate } from '@/assistance/date-range'
import {
  ATTENDANCE_PARAM,
  attendanceParamsToQueryString,
  parseAttendancePage,
  parseAttendanceQuery,
} from '@/assistance/filters'
import { ROUTES_V2 } from '@/consts/routes'
import { readParam } from '@/lib/search-params'
import { getServerT } from '@/lib/i18n/server'
import { getTodayIsoDateInAppTz, parseAppTzDateString } from '@/lib/timezone'

interface V2AttendancePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * Sección Asistencias.
 *
 * El día visible vive en la URL (`?date=`), igual que los filtros del listado
 * de clientes: hace la vista compartible, deja funcionando el botón atrás del
 * browser y —lo que importa acá— evita duplicar el estado del tab, que se
 * deriva de si ese parámetro está o no.
 *
 * `?date=` apuntando a hoy se redirige a la ruta pelada. Sin eso habría dos
 * URLs para exactamente el mismo contenido, y la segunda dejaría subrayado el
 * tab "Historial" mostrando el día de hoy.
 */
export default async function V2AttendancePage({ searchParams }: V2AttendancePageProps) {
  const params = await searchParams
  const { t, lang } = await getServerT()

  const todayIso = getTodayIsoDateInAppTz()
  const resolution = resolveAssistanceDate(readParam(params, ATTENDANCE_PARAM.date), todayIso)

  if (resolution.status === 'invalid') notFound()
  // Conserva búsqueda y página al sacar el `?date=` redundante: sin esto,
  // recargar una vista filtrada de hoy la dejaría sin filtro.
  if (resolution.status === 'explicitToday') {
    const queryString = attendanceParamsToQueryString({
      page: parseAttendancePage(params),
      query: parseAttendanceQuery(params),
    })

    redirect(
      queryString ? `${ROUTES_V2.V2_ATTENDANCE}?${queryString}` : ROUTES_V2.V2_ATTENDANCE
    )
  }

  const selectedDate = resolution.status === 'day' ? resolution.date : todayIso

  // `parseAppTzDateString` y no `new Date(iso)`: el segundo interpreta el
  // string como medianoche UTC, que en AR es las 21hs del día anterior, y la
  // lista mostraría el día equivocado sin que nada falle.
  const { assistances, failed } = await getAssistancesByDateResult(
    parseAppTzDateString(selectedDate)
  )

  return (
    <div className='flex min-h-full flex-col rounded-lg border p-2.5 md:h-full lg:p-5'>
      {/* Sólo mobile: en desktop el sidebar está siempre a la vista y el header
          de la app ya ocupa ese lugar, así que el diseño no dibuja ni título ni
          flecha. En mobile el sidebar es un drawer cerrado y la flecha es la
          única referencia de dónde está parado el operador. */}
      <div className='mb-4 flex items-center gap-3 md:hidden'>
        <Link
          aria-label={t('common.back')}
          className='flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-muted'
          href={ROUTES_V2.V2_HOME}
        >
          <ArrowLeft className='size-5' />
        </Link>
        <h1 className='text-base font-semibold'>{t('v2.attendance.title')}</h1>
      </div>

      {/* `key` por día: cambiar de día navega a una URL sin `?q=` ni `?page=`,
          y remontar es lo que hace que el estado del componente arranque de los
          valores nuevos en vez de arrastrar la búsqueda del día anterior. */}
      <AttendanceSection
        key={selectedDate}
        assistances={assistances}
        failed={failed}
        initialPageIndex={parseAttendancePage(params)}
        initialQuery={parseAttendanceQuery(params)}
        lang={lang}
        minIso={getMinAssistanceDate(todayIso)}
        selectedDate={selectedDate}
        todayIso={todayIso}
      />
    </div>
  )
}
