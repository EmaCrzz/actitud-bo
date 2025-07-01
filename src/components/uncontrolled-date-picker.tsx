'use client'

import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import CalendarIcon from '@/components/icons/calendar'
import { InfoIcon } from 'lucide-react'

interface UncontrolledDatePickerProps {
  name: string
  label?: string
  defaultValue?: string
  required?: boolean
  className?: string
  id?: string
  isDisabled?: boolean
  isInvalid?: boolean
  dateFormat?: 'long' | 'short'
  helperText?: string
}

const formatDate = (date: Date, format: 'long' | 'short') => {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()

  if (format === 'short') {
    return `${day}/${month}`
  }

  return `${day}/${month}/${year}`
}

export const UncontrolledDatePicker = React.forwardRef<
  HTMLInputElement,
  UncontrolledDatePickerProps
>(
  (
    {
      name,
      label,
      defaultValue,
      required,
      className,
      id,
      isDisabled,
      dateFormat = 'long',
      isInvalid,
      helperText,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)
    const [date, setDate] = React.useState<Date | undefined>(
      defaultValue ? new Date(defaultValue) : undefined
    )

    // Referencia interna para el input hidden
    const hiddenInputRef = React.useRef<HTMLInputElement>(null)

    // Combinar refs si se pasa una referencia externa
    const inputRef = React.useMemo(() => {
      if (typeof ref === 'function') {
        return (node: HTMLInputElement) => {
          hiddenInputRef.current = node
          ref(node)
        }
      } else if (ref) {
        return (node: HTMLInputElement) => {
          hiddenInputRef.current = node
          ref.current = node
        }
      }

      return hiddenInputRef
    }, [ref])

    const handleDateSelect = (selectedDate: Date | undefined) => {
      setDate(selectedDate)
      setOpen(false)

      // Actualizar el valor del input hidden
      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = selectedDate ? selectedDate.toISOString().split('T')[0] : ''

        // Disparar evento change para compatibilidad con librerías de formularios
        const event = new Event('change', { bubbles: true })

        hiddenInputRef.current.dispatchEvent(event)
      }
    }

    return (
      <div
        className={cn(
          `flex flex-col gap-3 w-full ${className}`,
          !isInvalid && !helperText ? 'mb-[20px]' : ''
        )}
      >
        {label && (
          <Label className='px-1 font-light' htmlFor={id || name}>
            {label}
            {required && <span className='text-red-500 ml-1'>*</span>}
          </Label>
        )}

        {/* Input hidden para el formulario */}
        <input
          ref={inputRef}
          defaultValue={defaultValue}
          id={id || name}
          name={name}
          required={required}
          type='hidden'
          value={date ? date.toISOString().split('T')[0] : ''}
        />

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              className={cn(
                'w-full text-base font-light px-2 py-3 sm:py-4 h-[50px]',
                date ? 'justify-between' : 'justify-end',
                isInvalid && 'border-red-500'
              )}
              disabled={isDisabled}
              type='button'
              variant='outline'
            >
              {date ? formatDate(date, dateFormat) : ''}
              <CalendarIcon className='text-white/30' />
            </Button>
          </PopoverTrigger>
          <PopoverContent align='start' className='w-auto overflow-hidden p-0'>
            <Calendar
              captionLayout='dropdown'
              mode='single'
              selected={date}
              onSelect={handleDateSelect}
            />
          </PopoverContent>
        </Popover>
        {helperText && (
          <small
            className={cn(
              'text-xs font-light flex gap-1 pt-1',
              isInvalid ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {isInvalid ? <InfoIcon className='size-4' /> : null}
            {helperText}
          </small>
        )}
      </div>
    )
  }
)

UncontrolledDatePicker.displayName = 'UncontrolledDatePicker'
