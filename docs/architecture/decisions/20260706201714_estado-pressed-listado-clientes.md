# Estado `pressed` / interacción en el listado de clientes

**Fecha:** 2026-07-06
**Autor:** federubents@gmail.com
**Rama:** docs/estado-pressed-listado-clientes

## Descripción

Se analizó el estado de interacción ("pressed") de cada fila del listado de
clientes en [`src/customer/list.tsx`](../../../src/customer/list.tsx) y el
componente [`Button`](../../../src/components/ui/button.tsx), y se implementó
una mejora para que **toda la fila** sea presionable con feedback de estado
pressed real.

Hallazgo del análisis inicial: la única zona interactiva de cada fila era el
ícono `eye`. El bloque de texto (nombre + tipo de membresía) era un `<div>`
puramente visual, sin `onClick`, sin `Link`, sin `hover` ni `active`. Además,
**no existía ningún estado `pressed` / `:active` en el código** — ni el
componente `Button` ni la variante `ghost` definen `active:*` ni `aria-pressed`.
Lo que se percibía como "pressed" en el ojo era la combinación de
`hover:text-white/70` (variante `ghost`) más el highlight nativo del navegador
al tocar el `<Link>`.

También se detectó un problema de markup: la fila envolvía un `<Link>` (`<a>`)
dentro de un `<Button>` (`<button>`) — un anchor dentro de un botón, HTML
inválido.

## Decisiones

### Decisiones de negocio

- **Toda la fila del listado es presionable** y abre el detalle del cliente
  (`/customer/[id]`), no solo el ícono. Es el patrón esperado en un listado:
  el usuario toca en cualquier parte de la fila.
- **Se mantiene el ícono `eye`** a la derecha como afordance visual ("ver
  detalle"), aunque ya no sea un control interactivo independiente.

### Decisiones técnicas

- **Opción elegida: fila completa como `<Link>`** (Opción 1 de las evaluadas).
  El `<Link>` de `next/link` envuelve todo el grid de la fila; el padding
  (`px-2 py-1`) se movió del `<li>` al `<Link>` para que toda la zona con
  padding sea clickeable. El `<li>` queda solo con el borde divisor para que
  la línea ocupe el ancho completo.
- **Estado pressed real:** `active:bg-input-background`, acompañado de
  `hover:bg-input-hover-background`, `transition-colors` y
  `focus-visible:ring-ring/50 focus-visible:ring-[3px]` para navegación por
  teclado. Es la **primera vez** que se define un estado `active:`/pressed en
  la app; se usaron los tokens de color existentes (`input-hover-background`,
  `input-background`) para mantener consistencia con el sistema de diseño.
- **El ícono `eye` deja de ser un `<Button variant="ghost">`** y pasa a ser un
  `<span>` decorativo con el `EyeIcon`. Esto también **corrige el HTML
  inválido** (anchor dentro de button) que existía antes.
- **Alternativa descartada:** agregar un estado `active:` solo al `Button` del
  ícono (Opción 2). Se descartó porque el pedido era que *toda* la fila tuviera
  el estado pressed, y mantener el tap solo en el ícono va contra la
  expectativa de UX de un listado.
- Los skeletons de carga (`isInitialLoading`, `isFetchingNextPage` y
  `CustomerListLoading`) no se tocaron: no necesitan estado pressed.

## Consideraciones de seguridad

No se identifican implicaciones de seguridad. Es un cambio de UI/interacción
sobre componentes de presentación; no toca autenticación, autorización,
exposición de datos, validación de input, dependencias ni infraestructura. El
destino del `<Link>` es la misma ruta (`/customer/[id]`) que ya usaba el ícono.

## Lecciones aprendidas

- La percepción de un "estado pressed" en el ícono `eye` no correspondía a
  ningún estilo `:active`/`aria-pressed` definido: era feedback por defecto del
  navegador más el `hover` de la variante `ghost`. Cualquier estado presionado
  intencional debe agregarse explícitamente (como se hizo acá).
- El markup previo anidaba un `<a>` dentro de un `<button>`, HTML inválido que
  pasó desapercibido. Al rediseñar la interacción de la fila conviene revisar
  la semántica del elemento, no solo el estilo.
- El type-check tiene un error **preexistente** en `.next/types/validator.ts`
  (typing de `params.lang` en `layout.tsx`), ajeno a este cambio. Se verificó
  stasheando la edición: el error aparece igual sin ella.

## Plan

### Pasos

1. **Análisis** — Revisar `list.tsx` y `button.tsx` para determinar qué estado
   de interacción existía por fila y confirmar que no había `active:`/pressed.
2. **Decisión de diseño** — Elegir entre fila completa presionable (Opción 1) o
   estado `active:` solo en el ícono (Opción 2). Se eligió Opción 1, manteniendo
   el ícono `eye` como afordance.
3. **Implementación** — En `list.tsx`, mover el `<Link>` para envolver toda la
   fila con `grid`, padding y estados `hover`/`active`/`focus-visible`; convertir
   el ícono en un `<span>` decorativo.
4. **Verificación local** — `npm run lint` (0 errores) y `npm run type-check`
   (solo el error preexistente de `validator.ts`).
5. **Pruebas locales** — Confirmar en el listado que tocar en cualquier parte de
   la fila abre el detalle, que el estado pressed se ve al presionar, y que el
   foco por teclado muestra el anillo.
