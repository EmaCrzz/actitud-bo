# Fondo del `DropdownMenu` — alinear tokens con el tema del tenant

**Fecha:** 2026-07-08
**Autor:** federubents@gmail.com
**Rama:** fix/dropdown-menu-popover-bg

## Descripción

El menú que se abre al tocar el avatar en el header
([`src/auth/components/header.tsx`](../../../src/auth/components/header.tsx) →
[`src/auth/components/menu.tsx`](../../../src/auth/components/menu.tsx)) se veía
**transparente**: no tenía color de fondo, por lo que el contenido de la pantalla
se transparentaba detrás del panel.

El menú es un `DropdownMenu` de Radix/shadcn
([`src/components/ui/dropdown-menu.tsx`](../../../src/components/ui/dropdown-menu.tsx)).
Al inspeccionarlo se detectó que el `DropdownMenuContent` (y el
`DropdownMenuSubContent`) usaban los tokens **por defecto de shadcn**
(`bg-popover`, `text-popover-foreground`) que **no existen en este proyecto**. La
app define sus colores por tenant con tokens propios
(`popover-background`, `popover-text`, `popover-border`) en
[`src/lib/themes/index.ts`](../../../src/lib/themes/index.ts) expuestos vía
[`globals.css`](../../../src/app/[lang]/[tenant]/globals.css). Como `bg-popover`
no resolvía a ningún color, Tailwind no aplicaba fondo y el panel quedaba
transparente.

El componente `Popover`
([`src/components/ui/popover.tsx`](../../../src/components/ui/popover.tsx)) **ya
estaba correctamente adaptado** a estos tokens; el `DropdownMenu` había quedado
sin migrar.

## Decisiones

### Decisiones de negocio

- El menú del avatar debe tener un **fondo sólido** (no overlay/backdrop, sino
  fondo del propio panel) para ser legible, consistente con el resto de las
  superficies flotantes de la app.

### Decisiones técnicas

- **Reutilizar los tokens ya existentes del tenant**, los mismos que usa
  `popover.tsx`, en vez de introducir colores nuevos o hardcodear valores:
  - `bg-popover` → `bg-popover-background`
  - `text-popover-foreground` → `text-popover-text`
  - `border` (color por defecto) → `border border-popover-border`
- Se aplicó el mismo cambio en `DropdownMenuContent` y en
  `DropdownMenuSubContent` para mantener consistencia entre menú y submenús.
- Para el tenant ACTITUD esto resuelve en fondo `#322d2f`, texto blanco al 80% y
  borde `rgba(255,255,255,0.3)`.
- **Alternativa descartada:** definir los tokens estándar de shadcn
  (`--color-popover`, `--color-popover-foreground`) en `globals.css`. Se descartó
  para no duplicar tokens que ya existen con otro nombre y para converger con la
  convención que ya sigue `popover.tsx`.

## Consideraciones de seguridad

No se identifican implicaciones de seguridad. El cambio es puramente de
presentación en el cliente: reemplaza clases de Tailwind por tokens de color
equivalentes. No modifica autenticación, autorización, exposición de datos,
validación de input, dependencias ni infraestructura.

## Lecciones aprendidas

- `navigation-menu.tsx` (línea 107) todavía usa los tokens fantasma
  `bg-popover text-popover-foreground`. No se tocó porque no está en uso en la
  app hoy, pero quedaría con el mismo bug de transparencia si se adoptara; queda
  anotado como deuda menor.

## Plan

### Pasos

1. Reemplazar en `DropdownMenuContent` los tokens `bg-popover` /
   `text-popover-foreground` por `bg-popover-background` / `text-popover-text` y
   agregar `border-popover-border`.
2. Aplicar el mismo cambio en `DropdownMenuSubContent`.
3. Verificar `type-check` (limpio) y `lint` (0 errores; warnings preexistentes de
   `console` en otros archivos, ajenos al cambio).
