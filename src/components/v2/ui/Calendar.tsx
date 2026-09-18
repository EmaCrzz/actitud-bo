'use client'

import * as React from 'react'
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { DayButton, DayPicker, getDefaultClassNames } from 'react-day-picker'

import { cn } from '@/lib/utils'

/**
 * Calendario de la v2.
 *
 * Existe en vez de reusar `@/components/ui/calendar` porque ese pinta **toda**
 * la grilla con blancos literales — `text-white` en el caption y en cada día,
 * `text-white/40` en los weekdays, `border-white/10` en la caja y
 * `divide-white/10` en los divisores — más el `Button` de v1, cuya base trae
 * `disabled:text-white` y cuyo `ghost` es `hover:text-white/70`. Sobre el maroon
 * oscuro de v1 eso se lee perfecto; sobre el blanco de v2 el calendario queda
 * invisible: se abre el popover y no se ve nada. No se arregla con `className`
 * porque los blancos están en el mapa de `classNames` interno, no en la raíz.
 *
 * Es el mismo criterio de `Select` v2: cuando el wrapper de shadcn pelea con la
 * paleta, se baja al primitive (acá `DayPicker` directo, sin el `Button` de v1)
 * y se pinta con tokens.
 *
 * La estructura visual es la misma que la referencia de v1 — caja con borde
 * alrededor de la grilla, weekdays afuera arriba, día seleccionado en círculo
 * relleno, "hoy" con un punto debajo — sólo cambia la paleta.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()

  const navButton = cn(
    'inline-flex size-(--cell-size) items-center justify-center rounded-lg p-0 select-none',
    'text-muted-foreground transition-colors hover:cursor-pointer hover:bg-muted hover:text-foreground',
    'outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
    'aria-disabled:pointer-events-none aria-disabled:opacity-40'
  )

  return (
    <DayPicker
      captionLayout={captionLayout}
      className={cn(
        'group/calendar p-3 text-foreground [--cell-size:--spacing(10)]',
        '[[data-slot=popover-content]_&]:bg-transparent',
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn('flex gap-4 flex-col md:flex-row relative', defaultClassNames.months),
        month: cn('flex flex-col w-full gap-4', defaultClassNames.month),
        nav: cn(
          'flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between',
          defaultClassNames.nav
        ),
        button_previous: cn(navButton, defaultClassNames.button_previous),
        button_next: cn(navButton, defaultClassNames.button_next),
        month_caption: cn(
          'flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)',
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          'w-full flex items-center text-sm font-medium justify-center h-(--cell-size) gap-1.5',
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          'relative rounded-lg border-none has-focus:ring-2 has-focus:ring-sidebar-ring',
          defaultClassNames.dropdown_root
        ),
        // El <select> nativo queda invisible arriba del label y captura el click.
        dropdown: cn('absolute inset-0 opacity-0 hover:cursor-pointer', defaultClassNames.dropdown),
        caption_label: cn(
          'select-none font-semibold text-foreground capitalize',
          captionLayout === 'label'
            ? 'text-sm'
            : 'rounded-lg pl-2 pr-1 flex items-center gap-1 text-sm h-8 [&>svg]:text-muted-foreground [&>svg]:size-3.5',
          defaultClassNames.caption_label
        ),
        table: 'w-full border-collapse',
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'flex-1 select-none text-[0.72rem] font-medium text-muted-foreground pb-2 uppercase tracking-wide',
          defaultClassNames.weekday
        ),
        // Caja con borde alrededor de la grilla de días (los weekdays quedan afuera, arriba).
        weeks: cn('flex flex-col rounded-lg border overflow-hidden', defaultClassNames.weeks),
        // Divisores internos: verticales entre celdas (divide-x) y horizontales entre filas (border-b).
        week: cn(
          'flex w-full divide-x divide-border border-b last:border-b-0',
          defaultClassNames.week
        ),
        week_number_header: cn('select-none w-(--cell-size)', defaultClassNames.week_number_header),
        week_number: cn(
          'text-[0.8rem] select-none text-muted-foreground',
          defaultClassNames.week_number
        ),
        day: cn(
          'relative flex-1 aspect-square p-1 text-center select-none group/day',
          defaultClassNames.day
        ),
        range_start: cn('rounded-l-md', defaultClassNames.range_start),
        range_middle: cn('rounded-none', defaultClassNames.range_middle),
        range_end: cn('rounded-r-md', defaultClassNames.range_end),
        // El marcado del día actual se resuelve en CalendarDayButton (punto + color).
        today: '',
        // Días de otro mes: celda atenuada para que el límite del mes se note.
        outside: cn('bg-muted/60 text-muted-foreground', defaultClassNames.outside),
        disabled: cn('text-muted-foreground opacity-40', defaultClassNames.disabled),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return <div ref={rootRef} className={cn(className)} data-slot='calendar-v2' {...props} />
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === 'left') {
            return <ChevronLeftIcon className={cn('size-4', className)} {...props} />
          }

          if (orientation === 'right') {
            return <ChevronRightIcon className={cn('size-4', className)} {...props} />
          }

          return <ChevronDownIcon className={cn('size-4', className)} {...props} />
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className='flex size-(--cell-size) items-center justify-center text-center'>
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      formatters={{
        formatMonthDropdown: (date) => date.toLocaleString('default', { month: 'short' }),
        // Weekdays en español, una letra (D L M X J V S), como la referencia.
        formatWeekdayName: (date) => date.toLocaleDateString('es-ES', { weekday: 'narrow' }),
        ...formatters,
      }}
      showOutsideDays={showOutsideDays}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  children,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  const isSingleSelected =
    modifiers.selected && !modifiers.range_start && !modifiers.range_middle && !modifiers.range_end
  const isToday = !!modifiers.today
  // "Hoy" se marca con un punto debajo del número; la selección (relleno) tiene prioridad.
  const showTodayDot = isToday && !isSingleSelected

  return (
    <button
      ref={ref}
      className={cn(
        'relative mx-auto flex size-9 aspect-square items-center justify-center rounded-full p-0',
        'text-sm font-normal leading-none text-foreground transition-colors hover:cursor-pointer',
        'outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        'hover:bg-muted',
        'disabled:pointer-events-none disabled:opacity-40',
        // Día de otro mes: número tenue.
        modifiers.outside && !isToday && !isSingleSelected && 'text-muted-foreground',
        // Día seleccionado: círculo relleno oscuro (el mayor énfasis disponible en la
        // escala neutral de v2, igual que el `contained` de Button).
        isSingleSelected && 'bg-foreground text-white font-semibold hover:bg-foreground',
        // Rango.
        'data-[range-start=true]:bg-foreground data-[range-start=true]:text-white data-[range-end=true]:bg-foreground data-[range-end=true]:text-white data-[range-middle=true]:bg-muted data-[range-middle=true]:rounded-none',
        defaultClassNames.day,
        className
      )}
      data-day={day.date.toLocaleDateString()}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      data-range-start={modifiers.range_start}
      data-selected-single={isSingleSelected}
      type='button'
      {...props}
    >
      {children}
      {showTodayDot && (
        <span className='absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-foreground' />
      )}
    </button>
  )
}

export { Calendar, CalendarDayButton }
export default Calendar
