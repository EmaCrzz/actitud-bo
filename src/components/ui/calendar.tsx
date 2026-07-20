'use client'

import * as React from 'react'
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { DayButton, DayPicker, getDefaultClassNames } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant = 'ghost',
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant']
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      captionLayout={captionLayout}
      className={cn(
        'group/calendar p-3 [--cell-size:--spacing(11)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent',
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
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          'size-(--cell-size) aria-disabled:opacity-50 p-0 select-none text-white/70 hover:text-white',
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          'size-(--cell-size) aria-disabled:opacity-50 p-0 select-none text-white/70 hover:text-white',
          defaultClassNames.button_next
        ),
        month_caption: cn(
          'flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)',
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          'w-full flex items-center text-sm font-medium justify-center h-(--cell-size) gap-1.5 ',
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          'relative shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md border-none',
          defaultClassNames.dropdown_root
        ),
        dropdown: cn('absolute inset-0 opacity-0', defaultClassNames.dropdown),
        caption_label: cn(
          'select-none font-semibold text-white capitalize',
          captionLayout === 'label'
            ? 'text-sm'
            : 'rounded-md pl-2 pr-1 flex items-center gap-1 text-sm h-8 [&>svg]:text-white/50 [&>svg]:size-3.5',
          defaultClassNames.caption_label
        ),
        table: 'w-full border-collapse',
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'flex-1 select-none text-[0.72rem] font-medium text-white/40 pb-2 uppercase tracking-wide',
          defaultClassNames.weekday
        ),
        // Caja con borde alrededor de la grilla de días (los weekdays quedan afuera, arriba).
        weeks: cn(
          'flex flex-col rounded-lg border border-white/10 overflow-hidden',
          defaultClassNames.weeks
        ),
        // Divisores internos: verticales entre celdas (divide-x) y horizontales entre filas (border-b).
        week: cn(
          'flex w-full divide-x divide-white/10 border-b border-white/10 last:border-b-0',
          defaultClassNames.week
        ),
        week_number_header: cn('select-none w-(--cell-size)', defaultClassNames.week_number_header),
        week_number: cn('text-[0.8rem] select-none text-white/40', defaultClassNames.week_number),
        day: cn(
          'relative flex-1 aspect-square p-1 text-center select-none group/day',
          defaultClassNames.day
        ),
        range_start: cn('rounded-l-md', defaultClassNames.range_start),
        range_middle: cn('rounded-none', defaultClassNames.range_middle),
        range_end: cn('rounded-r-md', defaultClassNames.range_end),
        // El marcado del día actual se resuelve en CalendarDayButton (color + ring).
        today: '',
        // Días de otro mes: celda atenuada para que el límite del mes se note.
        outside: cn('bg-white/[0.03] text-white/25', defaultClassNames.outside),
        disabled: cn('text-white/20 opacity-50', defaultClassNames.disabled),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return <div ref={rootRef} className={cn(className)} data-slot='calendar' {...props} />
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
        // Weekdays en español, una letra (L M M J V S D), como la referencia.
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
  // "Hoy" se marca con un punto rosa debajo del número; la selección (relleno) tiene prioridad.
  const showTodayDot = isToday && !isSingleSelected

  return (
    <Button
      className={cn(
        'relative mx-auto flex size-9 aspect-square items-center justify-center rounded-full p-0 text-sm font-normal leading-none text-white transition-colors',
        'hover:bg-white/10 hover:text-white',
        // Día de otro mes: número tenue.
        modifiers.outside && !isToday && !isSingleSelected && 'text-white/25',
        // Día seleccionado: círculo relleno rosa (el peso visual más fuerte lo tiene la selección).
        isSingleSelected && 'bg-primary text-white font-semibold hover:bg-primary hover:text-white',
        // Rango.
        'data-[range-start=true]:bg-primary data-[range-start=true]:text-white data-[range-end=true]:bg-primary data-[range-end=true]:text-white data-[range-middle=true]:bg-primary/25 data-[range-middle=true]:rounded-none',
        defaultClassNames.day,
        className
      )}
      data-day={day.date.toLocaleDateString()}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      data-range-start={modifiers.range_start}
      data-selected-single={isSingleSelected}
      size='icon'
      variant='ghost'
      {...props}
    >
      {children}
      {showTodayDot && (
        <span className='absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary' />
      )}
    </Button>
  )
}

export { Calendar, CalendarDayButton }
