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
 *
 * **Layout (verificado contra el Figma el 2026-09-16).** En desktop los cuatro
 * elementos comparten **una sola fila**: `[search flexible] [dropdowns] [acción]`.
 * En mobile se parte en dos, según la convención 2.1 del plan: primera fila el
 * search con la acción comprimida a ícono al lado, segunda fila los dropdowns
 * repartiéndose el ancho.
 *
 * Eso se resuelve con un único contenedor `flex-wrap` + utilidades `order`, no
 * con dos contenedores: el `w-full` de los dropdowns fuerza el salto de línea en
 * mobile y lo suelta en `sm`, y el `order` invierte acción y dropdowns entre
 * breakpoints. Con dos contenedores separados no había forma de que en desktop
 * quedaran en la misma fila sin duplicar el markup.
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
    // Search, dropdowns y acción miden los tres 36px por construcción (`h-9` en
    // el Input, en el SelectTrigger y en el size `md` del Button), así que
    // alinean sin depender del flex.
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {search && <div className='order-1 min-w-0 flex-1'>{search}</div>}
      {children && (
        // `w-full` fuerza el salto de línea en mobile (los dropdowns quedan en su
        // propia fila) y `sm:w-auto` los mete en la fila del search en desktop.
        // Los dropdowns traen su propio ancho de desktop: si dependieran del
        // contenedor se desbordarían, porque el SelectTrigger es `w-full`.
        <div className='order-3 flex w-full min-w-0 items-center gap-2 sm:order-2 sm:w-auto'>
          {children}
        </div>
      )}
      {action && <div className='order-2 shrink-0 sm:order-3'>{action}</div>}
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
