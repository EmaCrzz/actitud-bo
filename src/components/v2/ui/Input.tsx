import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Input de la v2.
 *
 * Existe por lo mismo que el Button de v2: el `Input` de `@/components/ui` está
 * muy customizado para v1 — `text-base` (16px) con `py-4`, lo que da ~56px de
 * alto, y `rounded-[4px]`. Al ponerlo al lado de un botón de v2 (40px) no
 * alinean.
 *
 * En el Figma los campos de búsqueda y los botones de la barra de filtros miden
 * los dos **36px** (`Input Search` 622×36 junto a `Buttons` 177×36 en el home,
 * `Search Bar` 306×36 junto a `New Client Button` 40×36 en Clientes), así que
 * la altura base acá es `h-9`.
 */
export default function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-9 w-full min-w-0 rounded-lg border bg-input-background px-3 text-sm',
        'placeholder:text-input-placeholder',
        // Con `type='search'`, WebKit dibuja su propio botón de cancelar — una
        // ✕ azul con estilos del sistema — que quedaba al lado del botón de
        // limpiar de la FilterBar: dos afordancias distintas para la misma
        // acción. Se esconde el nativo y queda el nuestro, que sigue los tokens
        // de v2. El `type='search'` se mantiene por la semántica (role
        // searchbox) y porque habilita Escape para limpiar.
        '[&::-webkit-search-cancel-button]:hidden',
        'outline-none transition-colors hover:border-input-hover-border',
        'focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-0',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className
      )}
      data-slot='input-v2'
      {...props}
    />
  )
}
