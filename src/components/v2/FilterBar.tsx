'use client'

import type { ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import Input from './ui/Input'
import { useTranslations } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'

/**
 * Barra de filtros de las secciones con tabla. En el Figma es el bloque
 * `Search field`: un `Input Search`, N `Dropdown` y una acción primaria.
 *
 * La cantidad de dropdowns varía por sección (Clientes 2, Ventas y Gastos 3,
 * Balance 2 sin search), así que se compone con children en vez de recibir un
 * array de configuración o flags — cada sección arma la suya.
 *
 *   <FilterBar
 *     search={<FilterBar.Search value={q} onChange={setQ} />}
 *     action={<Button>Nuevo cliente</Button>}
 *   >
 *     <FilterDropdown ... />
 *     <FilterDropdown ... />
 *   </FilterBar>
 */
interface FilterBarProps {
  /** Input de búsqueda. Omitir en secciones que no lo tienen (ej. Balance). */
  search?: ReactNode
  /** Acción primaria. En desktop va con texto; en mobile el Figma la reduce a ícono. */
  action?: ReactNode
  /** Los dropdowns de filtro. */
  children?: ReactNode
  className?: string
}

export default function FilterBar({ search, action, children, className }: FilterBarProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Search y acción miden los dos 36px por construcción (`h-9` en el Input
          y en el size `md` del Button), así que alinean sin depender del flex. */}
      {(search || action) && (
        <div className='flex items-center gap-3'>
          {search && <div className='min-w-0 flex-1'>{search}</div>}
          {action}
        </div>
      )}
      {children && <div className='flex flex-wrap items-center gap-2'>{children}</div>}
    </div>
  )
}

interface FilterSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function FilterSearch({ value, onChange, placeholder }: FilterSearchProps) {
  const { t } = useTranslations()
  const label = placeholder ?? t('common.search')

  return (
    <div className='relative'>
      <Search
        aria-hidden
        className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
      />
      <Input
        aria-label={label}
        className='pl-9 pr-9'
        placeholder={label}
        type='search'
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button
          aria-label={t('common.clear')}
          className='absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground hover:cursor-pointer'
          type='button'
          onClick={() => onChange('')}
        >
          <X className='size-4' />
        </button>
      )}
    </div>
  )
}

FilterBar.Search = FilterSearch
