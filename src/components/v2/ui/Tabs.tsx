'use client'

import * as TabsPrimitive from '@radix-ui/react-tabs'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * Tabs de la v2: **subrayado**, no segmented control.
 *
 * El `Tabs` de `components/ui/` es la variante pill de shadcn — su `TabsList`
 * trae `bg-muted rounded-lg p-[3px]` y el trigger activo se resuelve con
 * `data-[state=active]:bg-background` + sombra. El Figma del Perfil del cliente
 * (`2118:22907` y las 4 vistas del panel) dibuja lo contrario: texto plano en
 * fila, el activo en foreground con una línea debajo, y el resto en muted.
 *
 * Es el mismo criterio que ya separó `Button`, `Input` y `Select`: el primitive
 * de v1 no es "malo", tiene otra geometría, así que el átomo v2 se construye
 * sobre Radix directo en vez de pelearle con overrides.
 */
export const Tabs = TabsPrimitive.Root

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('flex items-center gap-6 border-b', className)}
      {...props}
    />
  )
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        // El -mb-px monta el borde del trigger sobre el de la lista, para que el
        // subrayado activo reemplace la línea en vez de dibujarse debajo.
        '-mb-px border-b-2 border-transparent pb-2 text-sm font-medium whitespace-nowrap',
        'text-muted-foreground transition-colors hover:text-foreground hover:cursor-pointer',
        'focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2',
        'data-[state=active]:border-foreground data-[state=active]:text-foreground',
        className
      )}
      {...props}
    />
  )
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('outline-none', className)} {...props} />
}
