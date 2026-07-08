# Banner de ambiente visible en dev y preview (invisible en producción)

**Fecha:** 2026-07-08
**Autor:** emanuel@getlenk.com
**Rama:** feat/db-restore-dev-script

## Descripción

Después de agregar el script `db:restore-dev` (que puebla el proyecto de dev
con datos reales de prod), quedó latente un riesgo operativo: como los datos
en dev son idénticos a prod, el operador puede dejar de percibir la
diferencia visual entre ambientes y modificar cosas en prod "sin darse
cuenta". El pedido concreto del owner fue:

> "Pon un label en algún sitio que indique que es dev, que esto no aparezca
> en prod. Solo para contextualizar al user en las pruebas y que en todo
> caso no meta cosas en prod sin darse cuenta."

Este ADR introduce el componente
[EnvBanner](../../../src/components/env-banner.tsx) montado en el root
layout, que renderiza una franja amarilla en el top de la app cuando el
build **no** es de producción, y devuelve `null` en producción real.

## Decisiones

### Decisiones de negocio

- **Priorizar visibilidad sobre elegancia.** Un banner delgado, amarillo,
  centrado y siempre presente en el top es difícil de ignorar. Alternativas
  descartadas: pill flotante (fácil de acostumbrarse y no verlo) y chip
  inline en el header (pasa desapercibido cuando el operador está apurado).
  El objetivo es que el operador nunca dude en qué ambiente está.

- **Texto en español, orientado al operador, no al dev.** El mensaje
  es "DEV — Ambiente de pruebas. Los cambios no afectan producción."
  Cualquier miembro del equipo debe entender de un vistazo qué implica ver
  este banner, incluso si no es técnico.

- **Aceptamos que se vea en local también.** Cuando un dev corre `npm run dev`
  local, no hay `NEXT_PUBLIC_VERCEL_ENV` y el banner se muestra. Es correcto
  desde la perspectiva del mental model: si no es prod real, mostralo.

### Decisiones técnicas

- **Detección con `process.env.NEXT_PUBLIC_VERCEL_ENV`.** Vercel inyecta
  esta variable automáticamente en cada build con los valores `'production' |
  'preview' | 'development'`. Es la fuente de verdad correcta para distinguir
  el ambiente destino del build. El `getVersionInfo()` existente en
  [src/lib/version.ts](../../../src/lib/version.ts) usa `NODE_ENV`, pero
  `NODE_ENV` en Vercel Preview es `'production'` (Next.js hace un build de
  producción para el preview) — no sirve para diferenciar preview de prod
  real.

- **Server component sin `'use client'`.** El componente no tiene interactividad
  ni state, solo lee `process.env.NEXT_PUBLIC_VERCEL_ENV` que se inlina en
  build time. Server component es más liviano (no agrega JS al cliente) y
  no hay riesgo de hydration mismatch porque el valor es estático.

- **Retornar `null` en prod en vez de un `display: none`.** Cero costo de
  render y cero JS enviado para clientes que no lo necesitan. Es un tree-shake
  efectivo desde el SSR.

- **`position: fixed` con `padding-top` compensatorio en el `<body>`.**
  Primera iteración fue meter el banner como hijo del grid del body
  (`grid-rows-[auto_1fr_auto]`), pero eso movía al `QueryProvider` de la
  row `auto` a la row `1fr`, y los loaders/páginas que dependen de
  `h-dvh` quedaban descolocados (aparecían huecos negros grandes en pantallas
  como `/incomes`). La versión final saca al banner del flujo con
  `fixed top-0 left-0 right-0 z-50 h-7` y compensa el alto con `pt-7` en el
  `<body>`, aplicado solo cuando `NEXT_PUBLIC_VERCEL_ENV !== 'production'`.
  Con esto el grid interno queda intacto y en prod no hay cambio de layout.

- **Sin dependencia de `next-themes` ni de tokens del design system.** El
  banner usa `bg-yellow-400 text-yellow-950` directo de Tailwind. La razón:
  este banner debe destacarse **fuera** de la paleta del tenant, no
  integrarse a ella. Cambiar el tenant no debería atenuar el warning.

- **Script `npm run dev:as-prod` para verificar el estado de producción
  localmente.** Al depender de `NEXT_PUBLIC_VERCEL_ENV`, la lógica del
  banner ausente + padding-top removido no es visible en `npm run dev`
  (donde la variable es `undefined`). Agregamos un script que arranca dev
  con `NEXT_PUBLIC_VERCEL_ENV=production`, para poder alternar los dos
  estados sin editar `.env.local` ni deployar. Cualquier feature futura que
  ramifique por env puede aprovechar el mismo comando.

### Alternativas descartadas

- **Env var custom `NEXT_PUBLIC_APP_ENV` en cada `.env.*`.** Más control
  pero agrega una variable más para mantener, y es fácil olvidarla en el
  próximo tenant. `NEXT_PUBLIC_VERCEL_ENV` viene gratis y es el estándar.

- **Detección por hostname en client-side (`window.location.hostname`).**
  Rompe SSR y agrega un flash de contenido al primer render. Descartado.

- **Reusar `VersionBadge` con el flag `isDevelopment`.** Está en el bottom-right
  como pill con la versión — mismo problema del pill flotante: los operadores
  aprenden a filtrarlo visualmente. El banner arriba es un canal separado.

## Consideraciones de seguridad

- **Exposición de datos:** ninguna. El componente no expone información
  sensible; solo confirma un dato que ya es público (URL del deploy indica
  el ambiente).
- **Autenticación / Autorización:** no aplica.
- **Validación de input:** no aplica.
- **Dependencias:** no se agrega ninguna. Usa `cn` de `@/lib/utils` que ya
  existe.
- **Infraestructura:** ninguna. Se apoya en `NEXT_PUBLIC_VERCEL_ENV` que
  Vercel ya inyecta.

## Lecciones aprendidas

- El helper `getVersionInfo()` existente usa `NODE_ENV` para determinar
  ambiente, pero eso no distingue Preview de Production en Vercel (ambos
  buildean como production de Next.js). El único diferenciador confiable
  provisto por Vercel es `NEXT_PUBLIC_VERCEL_ENV`. Vale documentarlo para
  evitar que futuras features caigan en el mismo malentendido.

- **Meter cualquier elemento dentro del grid del `<body>` afecta a `h-dvh`
  aguas abajo.** El grid `grid-rows-[auto_1fr_auto]` cambia el "row asignado"
  del primer hijo real cuando se agregan hermanos, y varios loaders de la
  app calculan altura con `h-dvh` asumiendo que el body tiene un layout fijo.
  Cuando algo se rompe visualmente después de tocar el layout root, el
  primer sospechoso es este acople. Solución genérica: sacar el elemento
  del grid con `fixed`/`absolute` y compensar padding.

## Plan

### Pasos

1. Crear `src/components/env-banner.tsx` server component con detección por
   `NEXT_PUBLIC_VERCEL_ENV`.
2. Importar y montarlo como primer hijo del `<body>` en
   `src/app/[lang]/[tenant]/layout.tsx`.
3. Verificar `type-check` y `lint` sin errores nuevos.
4. Reportar checklist de prueba manual: banner visible en local (`npm run dev`),
   invisible cuando el env var apunta a production, no tapa contenido, y
   se ve legible en las páginas principales.
