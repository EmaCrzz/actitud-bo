'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select'
import { useTranslations } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'

export interface FilterOption {
  value: string
  label: string
}

interface FilterDropdownProps {
  /** Etiqueta accesible. No se muestra: el Figma sólo muestra el valor. */
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
 * Los anchos (2 filtros → 159px c/u, 3 → 108.67px) salen del Figma mobile.
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
        className={cn('min-w-[108px] flex-1 sm:min-w-[159px] sm:flex-none', className)}
      >
        <SelectValue placeholder={label} />
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
