'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import DataTablePagination from '@/components/v2/DataTablePagination'
import FilterBar from '@/components/v2/FilterBar'
import { Tabs, TabsList, TabsTrigger } from '@/components/v2/ui/Tabs'
import { ROUTES_V2 } from '@/consts/routes'
import { attendanceParamsToQueryString } from '@/assistance/filters'
import { ATTENDANCE_PAGE_SIZE, type AssistanceByDate } from '@/assistance/utils'
import { useTranslations } from '@/lib/i18n/context'
import type { Language } from '@/lib/i18n/types'
import { shiftIsoDateInAppTz } from '@/lib/timezone'
import { cn } from '@/lib/utils'
import { normalizeSearchQuery } from '@/lib/utils/text'
import AttendanceList from './AttendanceList'
import DateNavigation from './DateNavigation'

export const ATTENDANCE_TAB_DAILY = 'daily'
export const ATTENDANCE_TAB_HISTORY = 'history'

interface AttendanceSectionProps {
  assistances: AssistanceByDate[]
  failed: boolean
  /** Día visible, "YYYY-MM-DD" en AR. */
  selectedDate: string
  todayIso: string
  /** Día más viejo navegable. */
  minIso: string
  lang: Language
  /** Búsqueda con la que llegó la URL. */
  initialQuery: string
  /** Página 0-indexed con la que llegó la URL. */
  initialPageIndex: number
}

/**
 * Sección Asistencias de v2.
 *
 * **El tab no es estado local: se deriva de la URL.** `/v2/attendance` es el
 * tab "Registro diario" y muestra hoy; `/v2/attendance?date=YYYY-MM-DD` es
 * "Historial". Un solo parámetro gobierna las dos cosas, así que no hay forma
 * de quedar en un estado incoherente —el tab Historial mostrando hoy, por
 * ejemplo— y la vista sigue siendo compartible y navegable con el botón atrás.
 * Es el mismo criterio que el ADR 20260727141418 aplicó al listado de clientes.
 *
 * **La búsqueda y la página también viven en la URL**, igual que en el listado
 * de clientes: la vista queda compartible, sobrevive a un F5 y al botón atrás.
 * Se escriben con `history.replaceState` y no con `router.replace` porque ese
 * último re-ejecutaría el server component —y volvería a consultar Supabase—
 * por cada tecla, para traer exactamente las mismas filas del día. El filtrado
 * es client-side: la página ya trae el día completo.
 *
 * **Desktop lleva tabs y mobile no**, tal como el diseño. En 390px la pantalla
 * ya gasta alto en flecha, título y navegador; sumarle una barra de tabs que
 * duplica lo que el navegador de día ya hace era demasiada cáscara sobre una
 * lista. En desktop, en cambio, los tabs ganan algo real: la vista por defecto
 * —hoy, que es casi todo el uso— no muestra ningún control de fecha.
 */
export default function AttendanceSection({
  assistances,
  failed,
  selectedDate,
  todayIso,
  minIso,
  lang,
  initialQuery,
  initialPageIndex,
}: AttendanceSectionProps) {
  const { t } = useTranslations()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState(initialQuery)
  const [page, setPage] = useState(initialPageIndex)

  const isToday = selectedDate === todayIso
  const activeTab = isToday ? ATTENDANCE_TAB_DAILY : ATTENDANCE_TAB_HISTORY
  const yesterdayIso = shiftIsoDateInAppTz(todayIso, -1)

  const total = assistances.length
  const hasAssistances = total > 0
  const trimmedQuery = query.trim()
  // `hasAssistances` en la condición, y no sólo el texto: un `?q=` en la URL de
  // un día sin asistencias dejaba la pantalla diciendo "sin resultados" con el
  // buscador oculto —porque ése depende de que el día tenga filas— y sin forma
  // de borrar la búsqueda. Sin asistencias el filtro no aplica y se ve el vacío
  // del día, que es lo que realmente pasa.
  const isFiltered = trimmedQuery.length > 0 && hasAssistances

  // Filtra por nombre y apellido, insensible a acentos y mayúsculas. Se usa
  // `normalizeSearchQuery` —el mismo normalizador que el buscador de clientes—
  // en vez de `normalizeText`, porque ése también borra la puntuación y dejaría
  // de encontrar apellidos como "O'Brien" escritos tal cual.
  const filtered = useMemo(() => {
    if (!isFiltered) return assistances

    const needle = normalizeSearchQuery(trimmedQuery)

    return assistances.filter((assistance) => {
      const { first_name: firstName, last_name: lastName } = assistance.customers

      return normalizeSearchQuery(`${firstName} ${lastName}`).includes(needle)
    })
  }, [assistances, isFiltered, trimmedQuery])

  // Sin esto, borrar una letra de la búsqueda puede dejar a la vista una página
  // que ya no existe y la lista se ve vacía con resultados disponibles.
  const lastPage = Math.max(0, Math.ceil(filtered.length / ATTENDANCE_PAGE_SIZE) - 1)
  const safePage = Math.min(page, lastPage)
  const visible = filtered.slice(
    safePage * ATTENDANCE_PAGE_SIZE,
    safePage * ATTENDANCE_PAGE_SIZE + ATTENDANCE_PAGE_SIZE
  )

  // El contador lleva label visible, no sólo el número del Figma. Esa maqueta
  // sólo tenía un valor posible; acá el número alterna entre el total del día y
  // los resultados de la búsqueda, y suelto no hay forma de saber cuál de los
  // dos se está leyendo. Mostrar siempre el total mientras la lista enseña tres
  // filas sería engañoso, y mostrar siempre los resultados haría desaparecer el
  // dato del día sin avisar.
  const headerCount = isFiltered ? filtered.length : total
  const headerLabel = isFiltered
    ? t('v2.attendance.count.results')
    : t('v2.attendance.count.total')

  const navigate = (href: string) => {
    startTransition(() => router.push(href))
  }

  const handleTabChange = (value: string) => {
    // Entrar a Historial aterriza en ayer, que es el día más reciente que ese
    // tab cubre. Salir vuelve a la ruta pelada, no a `?date=hoy`.
    navigate(
      value === ATTENDANCE_TAB_DAILY
        ? ROUTES_V2.V2_ATTENDANCE
        : `${ROUTES_V2.V2_ATTENDANCE}?date=${yesterdayIso}`
    )
  }

  const handleQueryChange = (value: string) => {
    setQuery(value)
    setPage(0)
  }

  // La URL refleja búsqueda y página, igual que el listado de clientes.
  //
  // `history.replaceState` y no `router.replace`: el segundo re-ejecuta el
  // server component y vuelve a consultar Supabase por el mismo día que ya
  // está en memoria. Next 15 soporta este patrón para updates de URL sin
  // navegación. Es `replace` y no `push` a propósito: escribir una entrada de
  // historial por cada tecla convierte el botón atrás en un deshacer letra a
  // letra.
  //
  // `safePage` y no `page`: si la búsqueda recortó los resultados, la URL tiene
  // que decir la página que realmente se está viendo.
  useEffect(() => {
    const queryString = attendanceParamsToQueryString({
      // El día se omite cuando es hoy: `/v2/attendance` pelada es lo que
      // distingue el tab "Registro diario" del "Historial".
      date: isToday ? null : selectedDate,
      page: safePage,
      query,
    })
    const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}`

    if (nextUrl !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, '', nextUrl)
    }
  }, [isToday, query, safePage, selectedDate])

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      {/* Desktop: tabs. El switch es por CSS y no por `useIsMobile()`, por el
          mismo motivo que el AppShell — el hook sólo resuelve post-mount y
          produce un flash de la variante equivocada al recargar. */}
      <Tabs className='hidden md:block' value={activeTab} onValueChange={handleTabChange}>
        <TabsList id='attendance-tabs'>
          <TabsTrigger value={ATTENDANCE_TAB_DAILY}>{t('v2.attendance.tabs.daily')}</TabsTrigger>
          <TabsTrigger value={ATTENDANCE_TAB_HISTORY}>
            {t('v2.attendance.tabs.history')}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Mobile: sin tabs, el navegador de día siempre visible y arriba del
          card. Su tope es hoy —no ayer— justamente porque acá no hay un tab
          aparte que cubra el día de hoy. */}
      <DateNavigation
        basePath={ROUTES_V2.V2_ATTENDANCE}
        className='md:hidden'
        currentDate={selectedDate}
        id='attendance-date-nav-mobile'
        lang={lang}
        maxDate={todayIso}
        minDate={minIso}
        todayDate={todayIso}
      />

      {/* El buscador aparece sólo si el día tuvo asistencias: filtrar una lista
          vacía no lleva a ningún lado. La condición mira el total del día y no
          los resultados, para que una búsqueda sin coincidencias no haga
          desaparecer el campo con el que se escribió. */}
      {hasAssistances && (
        <FilterBar
          search={
            <FilterBar.Search
              placeholder={t('v2.attendance.searchPlaceholder')}
              value={query}
              onChange={handleQueryChange}
            />
          }
        />
      )}

      <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border'>
        {/* Sin asistencias no se muestra el contador: un "0" al lado de un
            estado vacío que ya dice "Sin asistencias registradas" repite el dato
            y encima lo hace con el énfasis tipográfico de una métrica.
            En mobile el encabezado no tiene nada más que el total, así que la
            banda entera desaparece — el navegador de día vive afuera y arriba,
            no se pierde ningún control. */}
        <div
          className={cn(
            'flex items-center justify-between gap-3 border-b bg-muted/50 px-4 py-3',
            !hasAssistances && 'max-md:hidden'
          )}
        >
          {/* Sólo desktop: en mobile el navegador de día vive fuera del card y
              el título de la pantalla ya está en el header, así que la banda se
              queda únicamente con el contador — que con `justify-between` y un
              solo hijo se alinea a la izquierda. */}
          <div className='hidden flex-1 items-center md:flex'>
            {activeTab === ATTENDANCE_TAB_HISTORY ? (
              <DateNavigation
                basePath={ROUTES_V2.V2_ATTENDANCE}
                className='w-[385px] max-w-full bg-background'
                currentDate={selectedDate}
                id='attendance-date-nav-desktop'
                lang={lang}
                maxDate={yesterdayIso}
                minDate={minIso}
                todayDate={todayIso}
              />
            ) : (
              <span className='text-sm font-medium text-muted-foreground'>
                {t('v2.attendance.dailyTitle')}
              </span>
            )}
          </div>

          {hasAssistances && (
            <p className='flex shrink-0 items-baseline gap-2' id='attendance-count'>
              <span className='text-sm text-muted-foreground'>{headerLabel}</span>
              <span className='text-lg font-semibold'>{headerCount}</span>
            </p>
          )}
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto px-4'>
          <AttendanceList
            assistances={visible}
            failed={failed}
            isFiltered={isFiltered}
            isLoading={isPending}
            isToday={isToday}
            onRetry={() => router.refresh()}
          />
        </div>

        {/* Sólo cuando hay más de una página. El paginador de por sí ya esconde
            sus controles con una sola, pero seguiría dibujando su banda vacía. */}
        {filtered.length > ATTENDANCE_PAGE_SIZE && (
          <DataTablePagination
            className='border-t px-4 pb-4'
            page={safePage}
            pageSize={ATTENDANCE_PAGE_SIZE}
            total={filtered.length}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  )
}
