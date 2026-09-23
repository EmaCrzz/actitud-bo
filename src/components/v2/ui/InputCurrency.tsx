'use client'

import CurrencyInput from 'react-currency-input-field'
import { cn } from '@/lib/utils'

interface InputCurrencyProps {
  id?: string
  /** Monto en pesos. Controlado: el padre es dueño del número. */
  value: number
  onValueChange: (value: number) => void
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  className?: string
}

/**
 * Campo de monto de la v2.
 *
 * No reusa `InputCurrency` de `@/components/ui` por los mismos cuatro motivos
 * que ya hicieron propios al `Button`, el `Input`, el `Select` y el
 * `DatePicker`: ese mide ~50px de alto contra los 36 de la fila de v2, usa
 * `text-base`, va en `rounded-[4px]` y arrastra un `mb-[20px]` propio que
 * descuadra el `gap` de los formularios. Lo que sí se comparte es el motor —
 * `react-currency-input-field`, que ya es dependencia — y con él el formato de
 * miles y decimales en es-AR.
 *
 * Es **controlado y numérico**: emite el número, no el string formateado. La
 * conversión a texto es cosa del display; el padre calcula totales con lo que
 * sale de acá, así que devolver `"15.000"` sería mudarle el problema del parseo.
 * `undefined` (campo vacío) se emite como 0 — un monto vacío es no cobrar nada,
 * no un valor ausente.
 */
export default function InputCurrency({
  id,
  value,
  onValueChange,
  placeholder,
  disabled,
  invalid,
  className,
}: InputCurrencyProps) {
  return (
    <CurrencyInput
      allowDecimals
      disableAbbreviations
      allowNegativeValue={false}
      autoComplete='off'
      className={cn(
        // Misma geometría que Input, Select y DatePicker de v2 — 36px de alto.
        'h-9 w-full min-w-0 rounded-lg border bg-input-background px-3 text-sm',
        'placeholder:text-input-placeholder',
        'outline-none transition-colors hover:border-input-hover-border',
        'focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-0',
        'disabled:cursor-not-allowed disabled:opacity-40',
        invalid && 'border-feedback-error',
        className
      )}
      data-slot='input-currency-v2'
      decimalSeparator=','
      decimalsLimit={2}
      disabled={disabled}
      groupSeparator='.'
      id={id}
      placeholder={placeholder}
      prefix='$ '
      value={value}
      onValueChange={(_raw, _name, values) => onValueChange(values?.float ?? 0)}
    />
  )
}
