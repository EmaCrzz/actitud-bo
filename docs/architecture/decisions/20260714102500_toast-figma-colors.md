# Fondo y colores del toast — alinear con el diseño de Figma

**Fecha:** 2026-07-14
**Autor:** federubents@gmail.com
**Rama:** fix/toast-figma-colors

## Descripción

Las notificaciones (toasts) se veían con **fondo claro** (verde/rojo/amarillo pastel),
en vez del fondo oscuro que define el diseño. El pedido original fue corregir el
color de fondo por el que corresponde en Figma.

Al investigar aparecieron **tres causas encadenadas**, no una:

1. **El wrapper de tema era código muerto.** Existía
   [`src/components/ui/sonner.tsx`](../../../src/components/ui/sonner.tsx) que
   mapeaba los colores del toast a tokens del tenant, pero **nadie lo importaba**.
   [`layout.tsx`](../../../src/app/[lang]/[tenant]/layout.tsx) montaba
   `<Toaster />` importándolo **directo de `sonner`**, así que el wrapper nunca
   se ejecutó.
2. **`richColors` + tema `light` por defecto.** El `Toaster` se montaba con
   `richColors` y sin prop `theme`. Sonner aplicaba entonces su paleta pastel vía
   `[data-rich-colors='true'][data-sonner-toast][data-type='success']`
   (especificidad 0,3,0), que pisa cualquier `--normal-bg`. **De ahí salía el
   color claro.**
3. **Tokens fantasma.** Aun si el wrapper se hubiera usado, apuntaba a
   `var(--popover)`, `var(--popover-foreground)` y `var(--border)`, que **no
   existen en este proyecto**. Es exactamente el mismo bug que se corrigió en el
   `DropdownMenu` (ver `20260708120000_dropdown-menu-popover-bg.md`); el toast
   había quedado sin migrar.

Diseño de referencia (Figma, archivo `Registro de asistencias | Diseño`):
`mol/toast` (nodos `4720:12628`, `771:7000`) y `mol/error/message` (nodo `200:9827`).

## Decisiones

### Decisiones de negocio

- Los toasts usan **fondo oscuro `#0C0809`** (token `Background/800`) en todas las
  variantes, con el color de feedback aplicado al **borde y al ícono**.
- **Success:** borde, ícono y texto en `#20E36B` (`Feedback/Success/500`).
- **Error:** borde e ícono en `#E82531` (`Feedback/Error/500`), **texto en blanco**
  (`Secondary/100`), tal como muestra el frame `mol/error/message`.
- **El error se renderiza como toast flotante**, con el mismo placement que el
  success (361px, borde completo de 0.5px, `rounded 4px`), en vez de replicar el
  banner full-bleed del frame. Decidido con el usuario.
  - **Motivo:** el frame de error es de 393px (ancho completo del viewport), con
    borde y esquinas redondeadas **solo arriba**, o sea anclado al borde inferior
    de la pantalla. El de success es una tarjeta flotante de 361px (= 393 − 16×2 de
    márgenes). Son **placements distintos**, y `position`/`offset` de sonner son
    **globales para todos los toasts**: no se puede tener una variante full-bleed y
    otra flotante sin hackear el layout de ambas.
  - **Alternativa descartada:** fidelidad literal al frame de error, forzando
    `offset: 0` global y recomponiendo los márgenes del success por `classNames`.
    Se descartó por complejidad y porque afectaba el layout de todas las variantes.
- **`toast.warning` reusa el tratamiento de error** (mismo token `#E82531` e ícono
  `danger-triangle`). No tiene frame propio en Figma y tiene un solo uso
  (`personIdExists` en [`customer/errors.ts`](../../../src/customer/errors.ts));
  alinearlo al error evita dejar una variante con la paleta pastel vieja de sonner.

### Decisiones técnicas

- **Se mantiene `richColors`, y se le apuntan las variables a los tokens del
  tenant.** Contraintuitivo dado que `richColors` era parte del problema, pero es
  la **API de sonner para colorear por variante**: habilita
  `--success-*` / `--error-*` / `--warning-*`. Sin el flag, sonner ignora esas
  variables y pinta todo con `--normal-*`, dejando las tres variantes idénticas.
  Además, `richColors` es lo que hace que la descripción herede el color de la
  variante (`[data-rich-colors='true'] … [data-description] { color: inherit }`),
  que si no queda hardcodeada en gris.
  - **Alternativa descartada:** sacar `richColors` y colorear por variante con
    clases de Tailwind. Requería `!important` en todos los colores para ganarle a
    `[data-sonner-toast][data-styled='true']` (0,2,0), y encima había que
    reimplementar el color de la descripción a mano.
- **Colores por variable, estructura por clase.** Los colores van por las
  variables de sonner (inline en el `Toaster`, que gana sobre su stylesheet); el
  tamaño, peso y gap van por `toastOptions.classNames` con `!` de Tailwind v4,
  porque sonner los declara en `[data-sonner-toast][data-styled='true']` (0,2,0),
  que le gana a una utility suelta (0,1,0).
- **Tokens nuevos siguiendo la convención existente** (la misma que ya usa
  `popover`), en [`src/lib/themes/index.ts`](../../../src/lib/themes/index.ts)
  y expuestos en [`globals.css`](../../../src/app/[lang]/[tenant]/globals.css):
  - `components.toast` → `--color-toast-background` (`#0C0809`),
    `--color-toast-text` (`#ffffff`), `--color-toast-border`.
  - `feedback` (grupo nuevo, análogo a `primary`/`secondary`) →
    `--color-feedback-success` (`#20E36B`), `--color-feedback-error` (`#E82531`).
    El nombre calca la jerarquía `Feedback/Success/500` de Figma.
  - **Alternativa descartada:** hardcodear los hex en el componente. Se descartó
    para que los colores sigan siendo por tenant, como el resto del tema.
- **`theme='dark'` explícito** en vez de `useTheme()` de `next-themes`: **la app
  no tiene `ThemeProvider`**, así que el hook devolvía siempre `'system'` y dejaba
  el tema del toast a merced del sistema operativo. Se elimina la dependencia del
  hook en este componente.
- **El ícono del error necesita color explícito.** En success el ícono hereda
  `--success-text` (verde) vía `currentColor`; en error el texto es blanco, así
  que el ícono se pinta con `[&_[data-icon]]:text-feedback-error`.
- Se reusan los íconos ya existentes `check-circle-contained` y
  `alert-triangle-contained`, que ya usaban `currentColor`. No se agregaron SVGs.

## Consideraciones de seguridad

No se identifican implicaciones de seguridad. El cambio es puramente de
presentación en el cliente: agrega tokens de color y reemplaza clases/variables
CSS del toast. No modifica autenticación, autorización, exposición de datos,
validación de input, dependencias ni infraestructura. No se agregaron
dependencias nuevas.

## Lecciones aprendidas

- **El wrapper existía y no se usaba.** El bug real no era el color: era que
  `layout.tsx` importaba `Toaster` de `sonner` en vez de `@/components/ui/sonner`.
  Vale la pena revisar si hay otros componentes de `ui/` shadcn que estén
  bypasseados de la misma forma.
- **`navigation-menu.tsx` sigue usando los tokens fantasma** `bg-popover` /
  `text-popover-foreground` (ya anotado en el ADR del `DropdownMenu`, sigue sin
  tocarse porque no está en uso).
- Los otros tenants (`CORE`, `WELLRISE`) no definen `components` ni `feedback`, así
  que sus toasts caen en los defaults de sonner. Es la misma situación
  preexistente que ya tenían `input` y `popover`; no se abordó acá.
- **Los íconos del repo traen `width`/`height` 40 hardcodeados** en el `<svg>`, así
  que hay que pasarles `size-*` por `className` (como ya hacen el resto de los
  call sites). Dimensionar solo el contenedor `[data-icon]` de sonner no alcanza:
  el SVG lo desborda y se ve gigante, sobre todo en mobile. Se detectó en revisión
  visual, no en `type-check`/`lint`/`build`.
- **Pitfall de verificación:** al grepear el CSS compilado para confirmar que
  Tailwind generaba `border-[0.5px]!`, el minificador convierte `0.5px` → `.5px`,
  así que buscar `0.5px` da cero resultados y parece que la clase no se generó.
  La clase estaba bien todo el tiempo (`border-[0.5px]` se usa 15 veces en el
  proyecto). Verificar contra el nombre de clase escapado, no contra el valor.

## Plan

### Pasos

1. Agregar el grupo `feedback` (`success`, `error`) y el componente `toast`
   (`background`, `border`, `text`) al tema del tenant ACTITUD, y exponer los
   tokens en el `@theme inline` de `globals.css`.
2. Reescribir `src/components/ui/sonner.tsx`: apuntar las variables de sonner
   (`--normal-*`, `--success-*`, `--error-*`, `--warning-*`, `--width`,
   `--border-radius`) a los tokens del tenant, fijar `theme='dark'`, registrar los
   íconos de Figma y ajustar tipografía/gap/borde por `toastOptions.classNames`.
3. Cambiar el import de `Toaster` en `layout.tsx` de `sonner` a
   `@/components/ui/sonner` (**el fix de fondo**), y sacar `richColors` del
   call site ya que ahora lo define el wrapper.
4. Verificar `type-check` (limpio), `lint` (0 errores; 4 warnings de `console`
   preexistentes en archivos ajenos) y `build`.
5. Verificar contra el CSS compilado que las utilities se generen y que los tokens
   lleguen al HTML servido con los valores exactos de Figma.
6. Validación visual de las variantes en localhost a cargo del usuario.
</content>
</invoke>
