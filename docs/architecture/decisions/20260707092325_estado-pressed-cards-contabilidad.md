# Estado `pressed` / interacción en las cards de contabilidad

**Fecha:** 2026-07-07
**Autor:** federubents@gmail.com
**Rama:** feat/cards-contabilidad-presionables

## Descripción

Se analizaron las cards de resumen de la pantalla de contabilidad y finanzas en
[`src/accounting/components/stats-summary.tsx`](../../../src/accounting/components/stats-summary.tsx)
(Ingresos, Gastos y Balance) y se implementó una mejora para que **toda la card**
de Ingresos y de Gastos sea presionable con feedback de estado pressed real.

Hallazgo del análisis: la única zona interactiva de las cards de Ingresos y
Gastos era el ícono `eye`, envuelto en un `<Button variant="ghost">` con un
`<Link>` adentro. El resto de la card (título + monto) era puramente visual, sin
`onClick`, sin `Link`, sin `hover` ni `active`. No existía ningún estado
`pressed` / `:active` sobre la card: lo que se percibía como "pressed" era el
`hover:text-white/70` de la variante `ghost` más el highlight nativo del
navegador al tocar el `<Link>`.

Además se detectó el mismo problema de markup que en el listado de clientes: un
`<Link>` (`<a>`) dentro de un `<Button>` (`<button>`), HTML inválido.

Este cambio es la contraparte, en la pantalla de contabilidad, de la decisión ya
tomada para el listado de clientes en
[`20260706201714_estado-pressed-listado-clientes.md`](20260706201714_estado-pressed-listado-clientes.md).

## Decisiones

### Decisiones de negocio

- **Toda la card de Ingresos / Gastos es presionable** y navega al detalle
  correspondiente (`/incomes` y `/expenses`), no solo el ícono. Es el patrón
  esperado: el usuario toca en cualquier parte de la card.
- **Se mantiene el ícono `eye`** a la derecha como afordance visual ("ver
  detalle"), aunque ya no sea un control interactivo independiente.
- **La card de Balance no se toca:** no tiene ícono `eye` ni navegación, es solo
  resumen y no linkea a ningún lado.

### Decisiones técnicas

- **Card completa como `<Link>`:** el `<Link>` de `next/link` reemplaza al `<div>`
  contenedor y absorbe el estilo de la card (`p-4 rounded bg-input-background
  border-[0.5px] border-[#DAD7D8]`) más las clases interactivas. Se agregó `block`
  para que el `<a>` se comporte como bloque.
- **Estado pressed real:** `active:bg-input-background` acompañado de
  `hover:bg-input-hover-background`, `transition-colors`, `outline-none` y
  `focus-visible:ring-ring/50 focus-visible:ring-[3px]`. Se reutilizan
  **exactamente los mismos tokens** que en el listado de clientes para mantener
  consistencia con el sistema de diseño. Como la card ya usa `bg-input-background`
  como fondo base, el feedback se apoya sobre todo en la transición
  hover→pressed; se optó por consistencia de tokens sobre un pressed más marcado
  (decisión validada con el usuario).
- **El ícono `eye` deja de ser un `<Button variant="ghost">`** y pasa a ser un
  `<span>` decorativo (`text-primary200`) con el `EyeIcon`, corrigiendo el HTML
  inválido (anchor dentro de button).
- Se eliminó el import de `Button`, ya sin uso en el archivo.
- **Alternativa descartada:** un pressed más marcado con `active:brightness-95` /
  `active:opacity-80`. Se descartó a pedido del usuario para replicar 1:1 los
  tokens del ADR de clientes.
- Los skeletons de carga (`CardResumeSkeleton`) y el estado vacío ("No existen
  datos para este mes") no se tocaron: no necesitan estado pressed.

## Consideraciones de seguridad

No se identifican implicaciones de seguridad. El cambio es puramente de
presentación/interacción en el cliente: reordena markup y clases de Tailwind y
mueve la navegación del ícono a la card completa, apuntando a las mismas rutas
(`/incomes`, `/expenses`) que ya existían. No modifica autenticación,
autorización, exposición de datos, validación de input ni dependencias.

## Plan

### Pasos

1. Envolver las cards de Ingresos y Gastos en un `<Link>` completo con el estilo
   de la card + estado pressed (`active:bg-input-background`,
   `hover:bg-input-hover-background`, `transition-colors`, `focus-visible`).
2. Convertir el `<Button variant="ghost">` del ícono `eye` en un `<span>`
   decorativo, corrigiendo el HTML inválido.
3. Eliminar el import de `Button` sin uso.
4. Dejar la card de Balance intacta.
5. Verificar `type-check` (error preexistente en `.next/types/validator.ts`,
   ajeno al cambio) y `lint` (0 errores; warnings preexistentes de `console` en
   otros archivos).
