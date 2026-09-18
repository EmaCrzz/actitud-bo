import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Textarea de la v2.
 *
 * Mismo motivo que el `Input` de v2: el `Textarea` de `@/components/ui` está
 * calibrado para v1 (`text-base`, `rounded-[4px]`, tokens del tenant viejo) y al
 * ponerlo junto a un `Input` o un `Select` de v2 no comparte ni el radio ni la
 * tipografía.
 *
 * Sin `h-9`, a diferencia del resto de los campos: acá la altura la define el
 * contenido. El Figma dibuja el campo "Notas internas" del alta con unas cuatro
 * líneas de alto, que es lo que da `rows={4}`. Se deja redimensionable en
 * vertical — es el único campo del formulario donde el operador puede escribir
 * un texto largo y conviene que pueda verlo entero.
 */
export default function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'w-full min-w-0 resize-y rounded-lg border bg-input-background px-3 py-2 text-sm',
        'placeholder:text-input-placeholder',
        'outline-none transition-colors hover:border-input-hover-border',
        'focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-0',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className
      )}
      data-slot='textarea-v2'
      {...props}
    />
  )
}
