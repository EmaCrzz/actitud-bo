# Alert "semana completa" — alinear la variante `info` con Figma

**Fecha:** 2026-07-14
**Autor:** federubents@gmail.com
**Rama:** fix/assistance-alert-figma

## Descripción

Continuación de `20260714140359_assistance-alert-figma-colors.md`, en la misma rama
y el mismo componente. Ese ADR dejó anotada como deuda que el resto de las variantes
del `Alert` seguían apuntando a tokens fantasma; acá se cierra la variante `info`,
que es la del aviso **"¡Semana completa, sumá un pase diario!"** en
[`assistance/customer.tsx`](../../../src/assistance/customer.tsx).

**Estado previo:** la variante era
`'bg-indigo-400 text-info-foreground [&>svg]:text-current'`. Dos problemas:

- `bg-indigo-400` es un color **built-in de Tailwind** (`#818cf8`), no un token del
  design system. Se veía, pero con un violeta que no sale de Figma.
- `text-info-foreground` es un **token fantasma** (no existe). El texto se veía
  blanco por pura casualidad: al no aplicarse ningún color, heredaba el
  `--color-text` del tenant, que para ACTITUD es `#ffffff`.

Diseño de referencia: Figma, archivo `Registro de asistencias | Diseño`, componente
`mol/toast/warning` variante info (nodo `1323:9335`).

## Decisiones

### Decisiones de negocio

- El aviso usa **fondo azul sólido `#2196F3`** (`Feedback/Info/500`) con ícono y
  texto en blanco. Estructura idéntica al alert rojo de "asistencia ya registrada"
  (p-16, gap 4px, radius 4, Poppins SemiBold 14): **solo cambia el color**.
- **El ícono es el mismo que el del alert rojo** (`solar:danger-circle-bold`, el
  círculo relleno con `!`), no un ícono de información. Es lo que muestra el frame,
  aunque la variante se llame `info`.

### Decisiones técnicas

- **Token nuevo `--color-feedback-info` (`#2196F3`)**, agregado al grupo `feedback`
  del tenant ACTITUD, junto a `success` y `error`. Sigue la jerarquía `Feedback/*`
  de Figma y la convención que ya introdujo el ADR `20260714102500`.
- `bg-indigo-400` → `bg-feedback-info`: se reemplaza el color built-in de Tailwind
  por el token del design system.
- `text-info-foreground` → **`text-white`**: se hace explícito el color que antes
  llegaba por herencia accidental. Es lo que pide el frame (`Secondary/100`) y deja
  de depender de que el `--color-text` del tenant sea blanco — lo que rompería en un
  tenant de tema claro como `WELLRISE` o `CORE`.
- Se agrega `*:data-[slot=alert-description]:text-white/90`, igual que en
  `destructive`, para que una eventual `AlertDescription` no caiga en el fantasma
  `text-muted-foreground` del componente base.
- **`InfoIcon` de `lucide-react` → `AlertContainedIcon`**: el frame usa el mismo
  ícono que el alert rojo. `AlertContainedIcon` ya existe, mide 24px y usa
  `currentColor`, así que hereda el blanco. Se elimina el import de `InfoIcon`, que
  queda sin uso en el archivo.
- Mismos ajustes de fidelidad que en el alert rojo, por consistencia: `gap-x-1`
  (4px), `font-semibold` (600), se elimina el fantasma `font-secondary` y `mt-6` →
  `mt-3`.

## Consideraciones de seguridad

No se identifican implicaciones de seguridad. El cambio es puramente de
presentación en el cliente: agrega un token de color, reemplaza clases de Tailwind
y cambia un ícono. No modifica autenticación, autorización, exposición de datos,
validación de input, dependencias ni infraestructura. No se agregaron dependencias.

## Lecciones aprendidas

- **`variant='destructive'` también se usa en
  [`expenses/components/list.tsx`](../../../src/expenses/components/list.tsx)**
  (estado de error al cargar gastos), no solo en el alert de asistencia. El cambio
  del ADR anterior le da fondo rojo sólido donde antes no tenía ninguno — es la
  corrección del mismo bug, pero **cambia visualmente una pantalla fuera del
  alcance pedido**. Anotado para validación. Buscar todos los call sites de una
  variante antes de tocarla, no solo el que motivó el pedido.
- **Un estilo "que se ve bien" puede estar roto igual.** El texto blanco del alert
  info funcionaba por herencia del `--color-text` del tenant, no porque la clase
  hiciera algo. Habría roto en cualquier tenant de tema claro. Los tokens fantasma
  no siempre se manifiestan como algo visiblemente mal.
- **Tailwind escanea también los `.md`.** `bg-indigo-400` seguía generándose en el
  CSS después de sacarlo del código, porque el ADR anterior lo menciona en prosa y
  la detección automática de fuentes lo toma como candidato. Inocuo, pero a tener
  en cuenta al verificar si una clase quedó realmente sin uso: hay que grepear
  `src/`, no solo el CSS compilado.

## Plan

### Pasos

1. Agregar `info: '#2196F3'` al grupo `feedback` del tenant ACTITUD y exponer
   `--color-feedback-info` en el `@theme inline` de `globals.css`.
2. Reescribir la variante `info` de `Alert`: `bg-feedback-info`, `text-white`
   explícito y el mismo tratamiento de `AlertDescription` que `destructive`.
3. Ajustar el call site en `assistance/customer.tsx`: cambiar `InfoIcon` por
   `AlertContainedIcon` (y sacar el import muerto), gap 4px, `font-semibold`, sacar
   `font-secondary` y bajar el margen a `mt-3`.
4. Verificar `type-check` (limpio), `lint` (0 errores; 4 warnings de `console`
   preexistentes en archivos ajenos) y que `bg-feedback-info` se genere en un
   compilado real de Tailwind.
5. Validación visual en localhost a cargo del usuario. **Requiere reiniciar
   `npm run dev`**: el server que estaba corriendo servía un render previo al
   cambio del tema y no tomaba el token nuevo.
</content>
</invoke>
