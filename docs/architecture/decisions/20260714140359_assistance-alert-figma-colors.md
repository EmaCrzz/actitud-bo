# Fondo del alert "asistencia ya registrada" — alinear con Figma

**Fecha:** 2026-07-14
**Autor:** federubents@gmail.com
**Rama:** fix/assistance-alert-figma

## Descripción

El aviso **"Ya se registro una asistencia el dia de hoy"** —el que aparece al
intentar registrar una segunda asistencia en el mismo día— se veía **sin color de
fondo**: solo el ícono y el texto sueltos sobre el fondo de la pantalla.

A pesar de que Figma lo nombra `mol/toast/warning`, **no es un toast de sonner**:
es un `Alert` inline de shadcn renderizado dentro del flujo de la página
([`assistance-alert-today.tsx`](../../../src/assistance/assistance-alert-today.tsx)),
usado desde [`assistance/customer.tsx`](../../../src/assistance/customer.tsx) y
[`customer/membership-form.tsx`](../../../src/customer/membership-form.tsx). No
tiene relación con el trabajo del ADR `20260714102500_toast-figma-colors.md`.

**Causa raíz:** el componente usa `variant='destructive'`, que resuelve a la clase
`bg-destructive`. El token **`destructive` no existe en este proyecto** (no está
en [`globals.css`](../../../src/app/[lang]/[tenant]/globals.css) ni en
[`themes/index.ts`](../../../src/lib/themes/index.ts)). En Tailwind v4, sin
`--color-destructive` en el theme la utility **ni siquiera se genera**, así que el
alert quedaba sin fondo.

Es la **tercera aparición del mismo bug de tokens fantasma**, después del
`DropdownMenu` (`20260708120000_dropdown-menu-popover-bg.md`) y del toast de
sonner (`20260714102500_toast-figma-colors.md`): componentes de shadcn que quedaron
apuntando a los tokens por defecto de la librería en vez de a los del tenant.

Diseño de referencia: Figma, archivo `Registro de asistencias | Diseño`, componente
`mol/toast/warning` (nodo `1292:9398`), en pantalla `1314:19566`.

## Decisiones

### Decisiones de negocio

- El aviso usa **fondo rojo sólido `#E82531`** (`Feedback/Error/500`) con ícono y
  texto en blanco, según el frame. Es un tratamiento **distinto al del toast de
  sonner** (fondo oscuro con borde rojo): son componentes distintos y el diseño los
  trata distinto a propósito.

### Decisiones técnicas

- **Se reusa el token `--color-feedback-error`** ya existente en el tema, en vez de
  introducir un token `destructive`. Ese token entró con el ADR
  `20260714102500_toast-figma-colors.md` (PR #30, ya mergeado a `develop`) y vale
  exactamente el `#E82531` que pide este frame — es el mismo color del design
  system, así que no hay razón para duplicarlo bajo otro nombre.
  - **Alternativa descartada:** definir `--color-destructive` para que la variante
    `destructive` de shadcn funcione tal cual. Se descartó por no tener dos tokens
    con el mismo valor y nombres distintos, y para converger con la convención de
    nombres de Figma (`Feedback/*`).
- **`*:data-[slot=alert-description]:text-destructive/90` → `text-white/90`**: la
  clase vieja era otro token fantasma. Sobre fondo rojo sólido, la descripción va en
  blanco al 90%.
- **Alcance acotado al alert de asistencia** (decidido con el usuario). Ver
  "Lecciones aprendidas": el resto de las variantes de `Alert` tienen el mismo bug
  pero no tienen frame en Figma, así que arreglarlas requeriría inventar tokens.
- Ajustes de fidelidad en el call site, contra el frame:
  - `has-[>svg]:gap-x-1` (4px) para pisar el `gap-x-3` (12px) del `Alert` base.
    Funciona porque `cn()` usa `tailwind-merge` y la clase del call site gana.
  - `font-bold` (700) → `font-semibold` (600), que es lo que dice `font/semibold/14`.
  - Se elimina `font-secondary`, que **no existe** como utility (las reales son
    `font-primary` y `font-headline`, definidas en `globals.css`). No hacía nada:
    el texto ya heredaba Poppins.
  - `mt-6` (24px) → `mt-3` (12px), que es el gap que muestra el frame (~11px).
- **No se toca el ícono:** `AlertContainedIcon` ya es el círculo relleno con `!` de
  24px y usa `currentColor`, así que hereda el blanco del texto. Coincide con el
  `solar:danger-circle-bold` del diseño.
- `p-4` (16px), `rounded-[4px]` y `text-sm` (14px) del `Alert` base **ya coincidían**
  con el frame; no se tocaron.

## Consideraciones de seguridad

No se identifican implicaciones de seguridad. El cambio es puramente de
presentación en el cliente: reemplaza clases de Tailwind por tokens de color
existentes y ajusta espaciado y peso tipográfico. No modifica autenticación,
autorización, exposición de datos, validación de input, dependencias ni
infraestructura. No se agregaron dependencias ni tokens nuevos.

## Lecciones aprendidas

- **El componente `Alert` sigue lleno de tokens fantasma** más allá de `destructive`.
  Verificado contra un compilado real de Tailwind, **no se generan**:
  `text-card-foreground` (variante `default`), `text-info-foreground` (`info`),
  `text-success-foreground` (`success`) y `text-muted-foreground`
  (`AlertDescription`). La variante `info` se usa en `assistance/customer.tsx` y
  solo se ve porque `bg-indigo-400` es un color built-in de Tailwind, **no un token
  del design system**. Queda como deuda: no se abordó acá porque esas variantes no
  tienen frame en Figma y arreglarlas implicaría inventar tokens sin validar.
- **Tres componentes de shadcn con el mismo bug** (`DropdownMenu`, `Toaster`,
  `Alert`) sugieren que conviene una pasada sistemática buscando clases que
  apunten a tokens por defecto de shadcn (`*-foreground`, `destructive`, `muted`,
  `card`, `popover`) y no existan en el tema. Ni `type-check` ni `lint` los
  detectan: la clase simplemente no se genera y el estilo desaparece en silencio.
- **Pitfall de verificación (van dos):** para comprobar si una clase se genera hay
  que compilar Tailwind de verdad. En esta sesión fallaron tres intentos antes de
  dar con el método bueno: (1) grepear `.next/static/css/` cuando `npm run dev`
  del usuario lo había reemplazado — el archivo tenía **0 bytes** y *todo* daba
  "fantasma"; (2) `npm run build` en paralelo al dev server → `EPERM` sobre
  `.next/trace`; (3) grepear el CSS del dev server, que sirve solo el chunk de la
  ruta pedida (6KB). Lo que funciona:
  `npx @tailwindcss/cli -i globals.css -o /tmp/out.css`, que compila con detección
  automática de fuentes sin tocar `.next`. **Sanity check obligatorio:** el
  resultado tiene que discriminar — si `text-white` da "fantasma", el método está
  roto, no el código.
- **Ausencia de clase ≠ token faltante.** `bg-feedback-error` daba "no generada"
  antes de este cambio simplemente porque ningún archivo la usaba todavía; Tailwind
  solo genera lo que encuentra en el código. Lo que prueba que falta un token es que
  la clase **esté en uso** y aun así no se genere, que es el caso de `bg-destructive`.

## Plan

### Pasos

1. Cambiar la variante `destructive` de `Alert` para que use `bg-feedback-error`
   (token existente) en vez del fantasma `bg-destructive`, y corregir el
   `text-destructive/90` de la descripción a `text-white/90`.
2. Ajustar el call site en `assistance-alert-today.tsx` contra el frame: gap 4px,
   `font-semibold`, sacar `font-secondary` y bajar el margen superior a `mt-3`.
3. Verificar `type-check` (limpio), `lint` (0 errores; 4 warnings de `console`
   preexistentes en archivos ajenos) y que `bg-feedback-error` se genere en un
   compilado real de Tailwind.
4. Validación visual en localhost a cargo del usuario: es un cambio puramente
   visual y el proyecto no tiene tooling de browser.
</content>
</invoke>
