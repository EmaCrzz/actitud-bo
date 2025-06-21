"use client"

import * as React from "react"
import { Input, InputProps } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatPersonId } from "@/lib/format-person-id"

export interface PersonIdInputProps extends InputProps {
  onPersonIdChange?: (formattedValue: string, rawValue: string) => void
}

const PersonIdInput = React.forwardRef<HTMLInputElement, PersonIdInputProps>(
  ({ className, onPersonIdChange, onChange, defaultValue, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Combinar refs
    React.useImperativeHandle(ref, () => inputRef.current!, [])

    // Función para formatear el PersonId
    // const formatPersonId = (input: string): string => {
    //   const numbers = input.replace(/\D/g, "")
    //   const limitedNumbers = numbers.slice(0, 8)

    //   if (limitedNumbers.length <= 2) {
    //     return limitedNumbers
    //   } else if (limitedNumbers.length <= 5) {
    //     return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2)}`
    //   } else {
    //     return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 5)}.${limitedNumbers.slice(5)}`
    //   }
    // }

    // Función para obtener solo los números del PersonId
    const getRawValue = (formattedValue: string): string => {
      return formattedValue.replace(/\D/g, "")
    }

    // Manejar cambios en el input
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      const cursorPosition = e.target.selectionStart || 0
      const formatted = formatPersonId(inputValue)
      const raw = getRawValue(formatted)

      // Actualizar el valor del input directamente en el DOM
      if (inputRef.current) {
        inputRef.current.value = formatted

        // Calcular nueva posición del cursor
        const oldLength = inputValue.length
        const newLength = formatted.length
        const newCursorPosition = cursorPosition + (newLength - oldLength)

        // Restaurar posición del cursor
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition)
          }
        }, 0)
      }

      // Crear evento sintético con el valor formateado
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: formatted,
          // Agregar propiedades personalizadas para el valor sin formato
          rawValue: raw,
        },
      } as React.ChangeEvent<HTMLInputElement> & { target: HTMLInputElement & { rawValue: string } }

      // Llamar callbacks
      onChange?.(syntheticEvent)
      onPersonIdChange?.(formatted, raw)
    }

    // Formatear valor inicial si existe
    React.useEffect(() => {
      if (defaultValue && inputRef.current) {
        const formatted = formatPersonId(String(defaultValue))
        inputRef.current.value = formatted
      }
    }, [defaultValue])

    return (
      <Input
        {...props}
        ref={inputRef}
        type="text"
        onChange={handleChange}
        placeholder="XX.XXX.XXX"
        maxLength={10}
        className={cn(className)}
        defaultValue={defaultValue ? formatPersonId(String(defaultValue)) : undefined}
      />
    )
  },
)

PersonIdInput.displayName = "PersonIdInput"

export { PersonIdInput }
