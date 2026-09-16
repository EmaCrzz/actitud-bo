'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select'
import { useTranslations } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'

export interface FilterOption {
  value: string
  label: string
}

interface FilterDropdownProps {
  /**
   * Nombre del filtro ("Estado", "Membresías"). Es la etiqueta accesible y
   * además **lo que muestra el trigger mientras no hay nada seleccionado** —
   * verificado en el Figma del listado de clientes el 2026-09-16.
   */
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
  /** Valor que representa "sin filtrar". Default: `all`. */
  allValue?: string
  allLabel?: string
  className?: string
}

/**
 * Dropdown de filtro de la `FilterBar`.
 *
 * Mide 36px igual que el search y la acción primaria, para que los tres alineen
 * cuando comparten fila. El Figma los dibuja de 32px, pero ahí van en una fila
 * propia debajo del search en mobile; cuando conviven con los otros controles la
 * altura compartida se ve mejor que respetar el valor aislado.
 *
 * **Sin filtro aplicado el trigger muestra el nombre del filtro**, no el label
 * de la opción "todos": en el Figma dicen "Estado" y "Membresías", no "Todos los
 * estados". El label largo sí se usa dentro de la lista, donde hace falta que la
 * opción diga qué hace. Radix muestra por default el texto del item
 * seleccionado, así que el caso "todos" se renderiza a mano.
 *
 * En desktop cada dropdown ocupa su contenido (el Figma les da anchos distintos
 * según el texto); en mobile se reparten la fila en partes iguales — los anchos
 * del Figma mobile (2 filtros → 159px c/u, 3 → 108.67px) son exactamente eso.
 */
export default function FilterDropdown({
  label,
  value,
  options,
  onChange,
  allValue = 'all',
  allLabel,
  className,
}: FilterDropdownProps) {
  const { t } = useTranslations()

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        // `w-full` viene en la base del SelectTrigger (los selects de un
        // formulario ocupan el ancho de su campo). Acá el dropdown comparte fila
        // con otros elementos, así que en desktop necesita **ancho propio**: con
        // `w-full` y el contenedor en `w-auto`, cada trigger tomaba el 100% del
        // contenedor y dos de ellos se desbordaban pintando encima del botón de
        // al lado. `twMerge` deja pasar `w-full` + `sm:w-44` porque son
        // modifiers distintos, así que mobile sigue full-width.
        className={cn('min-w-0 flex-1 sm:w-44 sm:flex-none', className)}
      >
        {value === allValue ? <span className='truncate'>{label}</span> : <SelectValue />}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={allValue}>{allLabel ?? t('common.all')}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
