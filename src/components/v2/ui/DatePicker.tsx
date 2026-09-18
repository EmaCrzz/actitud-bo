'use client'

import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/v2/ui/Calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatCalendarDate } from '@/lib/format-date'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  /** Nombre del campo en el FormData. Se envía como "YYYY-MM-DD". */
  name: string
  id?: string
  /** "YYYY-MM-DD". El componente es no controlado: esto es sólo el valor inicial. */
  defaultValue?: string
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  className?: string
  /** Notifica el "YYYY-MM-DD" elegido. Para reglas cruzadas entre dos fechas. */
  onValueChange?: (value: string) => void
}

/**
 * Datepicker de la v2.
 *
 * No reusa `UncontrolledDatePicker` ([src/components/uncontrolled-date-picker.tsx])
 * aunque resuelve lo mismo: ese está calibrado para v1 y choca en cuatro puntos
 * que no se arreglan con `className` — mide 50px de alto contra los 36 de la
 * fila de v2, usa `text-base`, pinta el ícono con `text-white/30` (invisible
 * sobre la paleta clara), y arrastra un `mb-[20px]` propio. Es el mismo criterio
 * que ya se aplicó con `Button`, `Input` y `Select`.
 *
 * Por el mismo motivo monta el `Calendar` de v2 ([src/components/v2/ui/Calendar.tsx])
 * y no el de v1: ese pinta la grilla entera con blancos literales y sobre el
 * fondo claro de v2 el popover se abría vacío.
 *
 * Lo que sí se reusa es la lógica: el formato de display sale de
 * `formatCalendarDate`, que ya resuelve "YYYY-MM-DD" → "dd/mm/yyyy" **sin
 * conversión de timezone**. Es la parte que importa: el valor viaja como día
 * calendario de punta a punta y sólo se convierte a instante al salir hacia la
 * DB, con `parseAppTzDateString`. Si el componente guardara un `Date`, el
 * `toISOString()` de un browser al oeste de Greenwich ya devolvería el día
 * anterior.
 */
export default function DatePicker({
  name,
  id,
  defaultValue = '',
  placeholder,
  disabled,
  invalid,
  className,
  onValueChange,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState(defaultValue)

  // El calendario habla Date; el resto del componente habla "YYYY-MM-DD". Se
  // construye con `new Date(y, m - 1, d)` — constructor de componentes locales —
  // y no con `new Date(iso)`, que parsea como medianoche UTC y en AR pinta el
  // día anterior como seleccionado.
  const selected = React.useMemo(() => {
    if (!value) return undefined
    const [y, m, d] = value.slice(0, 10).split('-').map(Number)

    return new Date(y, m - 1, d)
  }, [value])

  const handleSelect = (date: Date | undefined) => {
    const next = date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
          date.getDate()
        ).padStart(2, '0')}`
      : ''

    setValue(next)
    setOpen(false)
    onValueChange?.(next)
  }

  return (
    <>
      <input name={name} type='hidden' value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              // Misma geometría que Input y Select de v2 — ver la convención de
              // altura de fila (36px) del Figma.
              'flex h-9 w-full items-center justify-between gap-2 rounded-lg border bg-input-background px-3 text-sm',
              'outline-none transition-colors hover:border-input-hover-border hover:cursor-pointer',
              'focus-visible:ring-2 focus-visible:ring-sidebar-ring',
              'disabled:cursor-not-allowed disabled:opacity-40',
              !value && 'text-input-placeholder',
              invalid && 'border-feedback-error',
              className
            )}
            data-slot='date-picker-v2'
            disabled={disabled}
            id={id ?? name}
            type='button'
          >
            <span className='truncate'>{value ? formatCalendarDate(value) : placeholder}</span>
            <CalendarIcon aria-hidden className='size-4 shrink-0 text-muted-foreground' />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align='start'
          // `!p-0` no es cosmético: el `data-v2` de abajo es lo que hace que el
          // portal herede la paleta de v2, pero arrastra con él el
          // `[data-v2='true'] { padding: 2rem 3rem }` de globals.css, que le
          // sumaría 48px por lado al calendario. Un `p-0` común pierde por
          // especificidad.
          className='w-auto overflow-hidden !p-0'
          data-v2='true'
        >
          <Calendar
            captionLayout='dropdown'
            mode='single'
            selected={selected}
            onSelect={handleSelect}
          />
        </PopoverContent>
      </Popover>
    </>
  )
}
