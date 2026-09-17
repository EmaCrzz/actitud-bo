'use client'

import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Select de la v2.
 *
 * Se construye sobre los primitives de Radix en vez de reusar
 * `@/components/ui/select` porque ese está atado a v1 en tres puntos que no se
 * arreglan con overrides:
 *
 * 1. El trigger trae `py-3 sm:py-4`, `rounded-[4px]` y `text-base`.
 * 2. `SelectContent` tiene **`text-white`** en su clase base.
 * 3. `SelectItem` hardcodea `hover:text-white` y `data-[highlighted]:text-white`
 *    sobre `bg-inputhover`. En v1 eso funciona porque el fondo es maroon oscuro;
 *    en v2, que es claro, el item resaltado quedaba **blanco sobre gris claro**,
 *    es decir invisible.
 *
 * Es el mismo criterio que se aplicó en `ConfirmDialog`: cuando el wrapper de
 * shadcn pelea con la paleta de v2, se baja al primitive de Radix.
 */

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        // 36px, igual que Input y Button — ver la convención de altura de fila.
        'flex h-9 w-full items-center justify-between gap-2 rounded-lg border bg-input-background px-3 text-sm',
        'data-[placeholder]:text-input-placeholder',
        'outline-none transition-colors hover:border-input-hover-border hover:cursor-pointer',
        'focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        'disabled:cursor-not-allowed disabled:opacity-40',
        "[&_span]:truncate [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      data-slot='select-trigger-v2'
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className='size-4 shrink-0 text-muted-foreground' />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = 'popper',
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          'relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] overflow-hidden',
          'rounded-lg border bg-popover-background text-popover-text shadow-md',
          // `!p-0` es obligatorio: el `data-v2` de abajo es lo que hereda la
          // paleta en el portal, pero arrastra con él el
          // `[data-v2='true'] { padding: 2rem 3rem }` de globals.css. Sin esto,
          // el desplegable se infla 48px a cada lado.
          '!p-0',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          position === 'popper' && 'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
          className
        )}
        data-slot='select-content-v2'
        data-v2='true'
        position={position}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className='flex h-6 items-center justify-center'>
          <ChevronUp className='size-4' />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport
          className={cn(
            'p-1',
            // Sin `h-*`: el alto lo resuelve el contenido contra el `max-h` del
            // Content. Fijarlo al alto del trigger recortaría la lista.
            position === 'popper' &&
              'w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1'
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className='flex h-6 items-center justify-center'>
          <ChevronDown className='size-4' />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex w-full items-center rounded-md py-2 pl-2 pr-8 text-sm outline-none select-none',
        // El resaltado oscurece el fondo y **mantiene** el color de texto. v1
        // lo pasaba a blanco, que sobre la paleta clara de v2 desaparece.
        'hover:cursor-pointer data-[highlighted]:bg-muted data-[highlighted]:text-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
        className
      )}
      data-slot='select-item-v2'
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className='absolute right-2 flex size-4 items-center justify-center'>
        <SelectPrimitive.ItemIndicator>
          <Check className='size-4' />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  )
}

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem }
