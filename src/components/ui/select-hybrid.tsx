'use client'

import * as React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { InfoIcon } from 'lucide-react'

interface HybridSelectProps {
  options: Array<{ value: string; label: string }>
  name: string
  defaultValue?: string
  placeholder?: string
  className?: string
  isInvalid?: boolean
  isDisabled?: boolean
  helperText?: string
}

export function HybridSelect({
  options,
  name,
  defaultValue,
  placeholder,
  className,
  helperText,
  isInvalid = false,
  isDisabled = false,
}: HybridSelectProps) {
  const [value, setValue] = React.useState(defaultValue || '')

  return (
    <div className={cn('w-full', !isInvalid && !helperText ? 'mb-[20px]' : '')}>
      {/* Hidden input para el formulario no controlado */}
      <input name={name} type='hidden' value={value} />

      <Select value={value} onValueChange={setValue}>
        <SelectTrigger
          className={cn(
            'w-full max-w-full border-input-border hover:bg-input-hover-background', // Asegura que no exceda el ancho del contenedor
            isInvalid && 'border-red-500',
            className
          )}
          disabled={isDisabled}
        >
          <SelectValue className='truncate max-w-full' placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className='border-input-border p-0'>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
