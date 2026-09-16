import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Botón de la v2.
 *
 * Existe en vez de reusar `@/components/ui/button` porque ese primitive lleva la
 * geometría de v1 (`rounded-[4px]`, `font-headline`) y sus variantes apuntan a
 * los tokens del tenant viejo. La v2 usa esquinas `rounded-lg` y la escala
 * neutral.
 *
 * Los estilos son los que ya estaban en el home v2, unificados: había dos
 * "contained" distintos (`bg-sidebar-accent` en la búsqueda de asistencia y
 * `bg-foreground` en el modal) y dos "outlined" con geometría distinta
 * (`py-2` vs `py-2.5`). Acá queda una sola definición de cada uno.
 *
 * Nota de color: todo en escala de grises a propósito. La paleta de marca (el
 * rosa del Figma) entra después en una pasada sobre las CSS vars de `[data-v2]`,
 * y al estar centralizada acá va a ser un cambio de un archivo.
 */
const buttonV2Variants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 shrink-0 [&_svg]:shrink-0 [&_svg]:pointer-events-none',
  {
    variants: {
      variant: {
        // Acción primaria. El negro es el mayor énfasis disponible en grises.
        contained: 'bg-foreground text-white hover:opacity-90',
        // Acción secundaria — el estilo de "Nuevo cliente" / "Ver perfil".
        outlined: 'border bg-transparent hover:bg-muted',
        // Sin borde, para acciones terciarias y botones de ícono.
        ghost: 'hover:bg-muted',
        // Borrados y acciones irreversibles.
        destructive: 'bg-feedback-error text-white hover:opacity-90',
      },
      // Alturas explícitas, no derivadas del padding: en el Figma los campos y
      // botones de una misma fila miden 36px (`Input Search` 622×36 junto a
      // `Buttons` 177×36). Dejarlo emerger del padding hacía que alinearan por
      // casualidad o no alinearan.
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-9 px-4 text-sm',
        icon: 'size-9 p-0',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'contained',
      size: 'md',
      fullWidth: false,
    },
  }
)

export interface ButtonV2Props
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonV2Variants> {
  /** Renderiza el hijo en vez de un <button>. Para envolver un <Link>. */
  asChild?: boolean
}

export default function Button({
  className,
  variant,
  size,
  fullWidth,
  asChild = false,
  ...props
}: ButtonV2Props) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      className={cn(buttonV2Variants({ variant, size, fullWidth }), className)}
      data-slot='button-v2'
      {...props}
    />
  )
}

export { buttonV2Variants }
