# Centralizar la resolución de `lang` / `tenant` en el módulo i18n

**Fecha:** 2026-09-08
**Autor:** ema_villanueva@hotmail.com
**Rama:** `refactor/i18n-server-t`

> **Estado: IMPLEMENTADO** (2026-09-15). El plan de abajo se ejecutó completo. Las
> desviaciones y los hallazgos nuevos están en la sección
> [Resultados de la implementación](#resultados-de-la-implementación) al final.

## Descripción

El sistema de i18n del proyecto ([src/lib/i18n/](../../../src/lib/i18n/)) es **type-safe**:
las keys de `t()` se derivan del diccionario `es.json` vía un *recursive path type*
([types.ts:9-29](../../../src/lib/i18n/types.ts#L9-L29)), así que `t('hola')` es un error de
compilación si la key no existe. Eso funciona bien y no se toca.

El problema no es el tipado, es **cómo llegan `lang` y `tenant` a los componentes**.

Hoy los dos valores viajan como **props threading** desde cada page hasta cada componente de
dominio, con un único propósito: poder llamar `api.fetch(lang, tenant)`. El relevamiento de la
situación actual:

- **12 server components** reciben `lang` y `tenant` como props exclusivamente para obtener `t`:
  `assistance-card-today`, `assistances-list`, `counter`, `shareable-top-image`,
  `top-monthly-assintant`, `auth/components/header`, `customer/info-resume`,
  `v2/DailySummaryCard`, `v2/MetricsRow`, `v2/WeeklyAttendanceCard`,
  `membership/active-types`, `membership/actives`.
- **18 pages/layouts** declaran `params: Promise<{ lang; ... }>`, hacen `await params` y
  castean sin validar (`lang as Language`, `tenant as TenantsType`) sólo para reenviar los
  valores hacia abajo.
- **1 client component** ([day-navigator.tsx](../../../src/assistance/day-navigator.tsx)) ya
  usa `useTranslations()` del provider y **no** necesita el prop para traducir — sólo lo usa
  para derivar un locale de `Intl`.

Lo que vuelve al threading redundante es que **`lang` y `tenant` son constantes de build**.
[next.config.ts](../../../next.config.ts) reescribe todas las rutas no-API prefijándolas con
los valores de env:

```ts
{ source: '/:path((?!api/).*)', destination: `/${APP_LANGUAGE}/${TENANT}/:path` }
```

Es decir: un deploy = un `APP_LANGUAGE` + un `TENANT`, fijados en build time. Los segmentos
`[lang]/[tenant]` no son visibles para el usuario, no hay selector de idioma (el módulo
[index.ts](../../../src/lib/i18n/index.ts) con `getBrowserLanguage`/`setLanguage` está
completamente comentado) y — por ser un rewrite `afterFiles`, que corre antes de las rutas
dinámicas — pegarle directo a `/en/wellrise/customer` tampoco resuelve: se le vuelve a
prefijar y da 404.

Conclusión: estamos pagando ceremonia de routing multi-locale para una combinación fija,
y propagando dos valores constantes por 30 archivos.

## Decisiones

### Decisiones de negocio

- **Se mantiene la capacidad multi-tenant / multi-idioma como objetivo vigente.** El
  diccionario base + overrides por tenant (`dictionaries/tenant/{actitud,core,wellrise}.json`)
  se conserva tal cual. Este refactor **no** reduce el soporte multi-tenant, sólo cambia por
  dónde viajan los dos valores que lo seleccionan.
- **No se prioriza hoy servir varios tenants desde un mismo deploy.** El modelo actual
  (un deploy por tenant, vía env vars) sigue siendo el vigente. Si eso cambia, ver la nota de
  migración al final de la sección técnica.

### Decisiones técnicas

- **Se mantienen los segmentos `[lang]/[tenant]` en el App Router.** Alternativa considerada:
  eliminarlos, mover el árbol a `src/app/*` y borrar el rewrite. Descartada por ahora:
  - Es el único camino de bajo costo hacia multi-tenant desde un solo deploy (tenant derivado
    del `Host` header en middleware). Sacarlos y volverlos a poner cuesta más que mantenerlos.
  - El costo real de mantenerlos, una vez hecho este refactor, se reduce al `params` boilerplate
    en pages — que es aceptable y localizado.
  - Es un cambio de routing con riesgo de regresión (el rewrite ya causó un 404 en las rutas
    API dinámicas, documentado en el comentario de `next.config.ts`); no vale mezclarlo con
    una limpieza de props.

- **Se elimina el props threading de `lang` / `tenant` hacia componentes de dominio**,
  reemplazándolo por un helper server-side `getServerT()` en un nuevo
  `src/lib/i18n/server.ts` que resuelve ambos valores internamente y delega en `api.fetch()`.

  Los componentes pasan de:

  ```tsx
  export default async function MetricsRow({ metrics, lang, tenant }: MetricsRowProps) {
    const { t } = await i18n.fetch(lang, tenant)
  ```

  a:

  ```tsx
  export default async function MetricsRow({ metrics }: MetricsRowProps) {
    const { t } = await getServerT()
  ```

  Alternativas consideradas:
  - **Pasar `t` como prop en lugar de `lang`/`tenant`.** Reduce a un prop pero sigue siendo
    threading, y `t` es una función: no serializa cruzando el borde a client components.
    Descartada.
  - **Usar `React.cache()` como store request-scoped**: el layout escribe `lang`/`tenant`, los
    componentes leen. Funciona, pero es un "context de server" implícito, frágil ante
    refactors del árbol y sin garantías de orden de ejecución. Descartada por complejidad
    injustificada frente a leer env.
  - **Leer `params` en cada componente.** Imposible: `params` sólo llega a pages y layouts.

- **`getServerT()` resuelve `lang` y `tenant` desde env, no desde la URL.** Es la fuente de
  verdad real: el rewrite ya deriva los segmentos de `APP_LANGUAGE` / `TENANT`, así que leer
  env elimina un salto indirecto y, con él, los casts sin validar sobre input de URL.

  **Tradeoff explícito:** esto sacrifica el carácter *request-scoped* de `params`. Si en el
  futuro el tenant se deriva por request (del `Host` header), `getServerT()` tendrá que pasar
  a leer `headers()` en vez de env. Se acepta porque ese cambio queda confinado a **un
  archivo** en lugar de los 12 componentes de hoy: la abstracción centraliza el acoplamiento
  en vez de distribuirlo. Ése es justamente el valor del refactor.

- **`APP_LANGUAGE` se lee dentro de `src/lib/i18n/server.ts`, NO se agrega a
  [src/lib/envs.ts](../../../src/lib/envs.ts).** `envs.ts` mezcla vars `NEXT_PUBLIC_*` con
  `TENANT` (que no es pública); hoy sólo lo importa el layout (server), pero si alguna vez lo
  importa un client component, `TENANT` se inlinea como `''` sin error visible. No agravamos
  ese footgun: la var server-only vive en el módulo server-only que la usa.

- **Los client components no cambian.** `useTranslations()` +
  [I18nClientProvider](../../../src/lib/i18n/context.tsx) ya funcionan y no necesitan los
  props. `getServerT()` queda marcado como server-only en su docstring y nunca debe importarse
  desde un componente `'use client'`.

- **El `lang` usado para formateo `Intl` se trata como concern separado del copy.** Hay tres
  call sites que mapean `lang` a un locale de `Intl` con lógica duplicada:
  - `lang === 'en' ? 'en-US' : 'es-AR'` en
    [day-navigator.tsx:32](../../../src/assistance/day-navigator.tsx#L32)
  - el mismo ternario en `formatTodayForHeader()` de
    [v2/layout.tsx](../../../src/app/[lang]/[tenant]/v2/layout.tsx)
  - `lang === 'es' ? 'es-ES' : 'en-US'` en
    [auth/components/header.tsx:35](../../../src/auth/components/header.tsx#L35)

  Se extrae un único `getIntlLocale(lang)` al módulo i18n y se reemplazan los tres. Cumple la
  regla del proyecto de no duplicar utilidades: una función canónica en vez de tres ternarios.

- **Se corrige un locale mal hardcodeado, encontrado durante el relevamiento.**
  [assistance-card-today.tsx](../../../src/assistance/assistance-card-today.tsx) formatea la
  fecha de "hoy" con `new Intl.DateTimeFormat('es-ES', ...)` en dos lugares (líneas 19 y 52),
  ignorando el `lang` que recibe como prop. El negocio opera en Argentina: debe ser `es-AR`
  vía `getIntlLocale()`. Es cosmético (afecta formato, no el valor de la fecha) y **no** es un
  bug de timezone — no toca los helpers de [src/lib/timezone.ts](../../../src/lib/timezone.ts)
  ni fechas que se persistan — pero se arregla de paso ya que se toca el archivo.

- **Se corrige un claim incorrecto del ADR anterior.** El ADR
  [20260818111458_v2-i18n-y-composition-fixes.md](./20260818111458_v2-i18n-y-composition-fixes.md)
  afirma en su sección de seguridad: *"El middleware ya valida ambos [`lang` y `tenant`] antes
  de llegar al layout (rutas inválidas → redirect)"*. Es falso:
  [src/lib/supabase/middleware.ts](../../../src/lib/supabase/middleware.ts) sólo ejecuta
  `updateSession` y no contiene lógica de `lang`/`tenant`. Lo que en la práctica impide
  valores arbitrarios es el rewrite, no una validación. Se agrega una nota correctiva en ese
  ADR (sin reescribir su historia).

- **`examples.md` pasa a ser correcto en vez de aspiracional.** El ADR anterior detectó que
  [examples.md](../../../src/lib/i18n/examples.md) documenta un `getServerT()` inexistente, y
  decidió **no** crearlo por la regla de no agregar abstracción sin múltiples consumers. Esa
  condición ahora se cumple con holgura (12 consumers), así que se crea el helper y se
  actualiza la doc para que coincida con la API real.

## Consideraciones de seguridad

- **Autenticación / Autorización:** sin cambios. El refactor no toca `middleware.ts`,
  `getCurrentUser()`, RLS ni permisos. Ningún componente cambia quién puede verlo.
- **Exposición de datos:** sin cambios. No se agregan queries ni se modifican payloads. Los
  diccionarios de traducción no contienen datos de clientes ni PII.
- **Validación de input:** **mejora neta.** Hoy 18 pages/layouts castean `lang`/`tenant` provenientes
  de la URL a `Language`/`TenantsType` sin validar, apoyándose en una validación de middleware
  que no existe. Al resolver ambos valores desde env, el path de i18n deja de depender de
  input no confiable. Nota sobre el impacto real del gap actual: un `lang` arbitrario sólo
  llegaría a `await import('./dictionaries/${lang}.json')`, cuyo template literal restringe la
  resolución al directorio de diccionarios (no hay path traversal a archivos arbitrarios) y
  cuyo fallo cae en el `catch` de `api.fetch`. Es decir: hoy es un bug de robustez, no una
  vulnerabilidad — pero se cierra igual.
- **Dependencias:** ninguna nueva. Todo se resuelve con `React.cache` y `Intl`, ya en uso.
- **Infraestructura:** sin cambios. No se toca el rewrite, headers, matcher del middleware ni
  configuración de red. `APP_LANGUAGE` y `TENANT` no son secretos (ya se leen en
  `next.config.ts` y `TENANT` ya está en `envs.ts`), y siguen siendo server-only: no se
  promueven a `NEXT_PUBLIC_*`.

## Lecciones aprendidas

- **El threading era invisible porque cada call site parecía razonable.** Ningún archivo por
  separado se ve mal: recibir `lang`/`tenant` y llamar `api.fetch` es idiomático. El costo sólo
  aparece al contar los 30 archivos que propagan dos constantes de build.
- **La regla de "no abstraer sin múltiples consumers" tiene contracara.** Fue correcto no
  crear `getServerT()` cuando había un consumer; el punto es volver a evaluarla cuando el
  contador sube. Acá pasó de 1 a 12 en unos pocos features.
- **Los ADR pueden fijar afirmaciones no verificadas.** El claim de validación en middleware
  del ADR anterior sonaba plausible y quedó escrito como hecho. Al escribir la sección de
  seguridad de un ADR, verificar en el archivo — no asumir por el diseño esperado.
- **Un rewrite global es un mecanismo silencioso.** Los segmentos `[lang]/[tenant]` dan la
  impresión de ser routing multi-locale real; en la práctica son un detalle interno que el
  usuario nunca ve. Vale tenerlo presente antes de construir features asumiendo que la URL
  puede variar el idioma.

## Plan

### Pasos

1. **Crear la rama desde `develop`.**
   ```bash
   git checkout develop && git pull
   git checkout -b refactor/i18n-server-t
   ```

2. **Crear `src/lib/i18n/server.ts`** (server-only, documentado como tal):
   - `getServerT()`: resuelve `lang` desde `process.env.APP_LANGUAGE` y `tenant` desde
     `process.env.TENANT`, valida contra `LANGUAGES` / `TENANTS` (fallback a `es` / error
     explícito si el tenant no es válido) y delega en `api.fetch(lang, tenant)`. Devuelve
     `{ t, dictionary, lang, tenant }` — `lang` incluido para los consumers que formatean con
     `Intl`. Sin caché propia: `api.fetch` ya está envuelto en `React.cache()`, así que
     llamarlo N veces por request no duplica trabajo.
   - `getIntlLocale(lang)`: `'en' → 'en-US'`, `'es' → 'es-AR'`. Única fuente de verdad para el
     mapeo idioma → locale de `Intl`.

3. **Migrar los 12 server components** a `getServerT()`, eliminando los props `lang` y
   `tenant` de sus interfaces:
   `assistance/assistance-card-today.tsx`, `assistance/assistances-list.tsx`,
   `assistance/counter.tsx`, `assistance/shareable-top-image.tsx`,
   `assistance/top-monthly-assintant.tsx`, `auth/components/header.tsx`,
   `customer/info-resume.tsx`, `home/components/v2/DailySummaryCard.tsx`,
   `home/components/v2/MetricsRow.tsx`, `home/components/v2/WeeklyAttendanceCard.tsx`,
   `membership/components/active-types.tsx`, `membership/components/actives.tsx`.

4. **Limpiar los call sites en pages/layouts:** quitar `lang={...}` / `tenant={...}` de los
   JSX; los `await api.fetch(lang, tenant)` propios de una page pasan a `await getServerT()`.
   Donde `params` queda sin uso, eliminar la firma completa (`params: Promise<{ lang; tenant }>`,
   el `await params` y los casts). Archivos: los 18 bajo `src/app/[lang]/[tenant]/`.

5. **Unificar el mapeo de locale `Intl`:** reemplazar los tres ternarios duplicados por
   `getIntlLocale()` en `day-navigator.tsx`, `v2/layout.tsx` (`formatTodayForHeader`) y
   `auth/components/header.tsx`. Para `day-navigator.tsx` (client) el `lang` puede quedar como
   prop — es el único caso donde el valor sí tiene que cruzar el borde server→client — o
   resolverse pasando el locale ya calculado.

6. **Corregir `assistance-card-today.tsx`:** los dos `Intl.DateTimeFormat('es-ES', ...)`
   (líneas 19 y 52) pasan a usar `getIntlLocale(lang)` con el `lang` de `getServerT()`.

7. **Decidir el `lang` del `<html>`:** en
   [layout.tsx:65](../../../src/app/[lang]/[tenant]/layout.tsx#L65) el atributo sale de
   `params`. Cambiarlo a `getServerT()` para que env sea la única fuente de verdad y el layout
   deje de castear input de URL. `params` queda entonces como puro mecanismo de routing,
   sin consumers.

8. **Actualizar la documentación:**
   - `src/lib/i18n/examples.md`: reflejar la API real
     (`getServerT()` / `getIntlLocale()` en server, `useTranslations()` en client) y eliminar
     las referencias a `getServerTranslations()`, `useT()`, `hooks.ts` y `server.ts` que nunca
     existieron con esa forma.
   - `20260818111458_v2-i18n-y-composition-fixes.md`: nota correctiva sobre la validación
     inexistente en middleware (paso documentado en Decisiones técnicas).

9. **Verificar localmente:** `npm run type-check` y `npm run lint` deben pasar. El type-check
   es el mejor aliado del refactor: cualquier prop `lang`/`tenant` olvidado en un call site
   rompe la compilación.

10. **Actualizar este ADR** con los resultados finales (Descripción + Decisiones) y commitear
    junto con el refactor, en el mismo commit o adyacente.

### Checklist de pruebas manuales (para el PR)

Todo verificable en el preview, sin SQL ni migraciones. El refactor no toca datos ni queries:
lo único que puede romperse es que un texto salga como key cruda (`v2.home.metrics.todayAttendances`
en vez de "Asistencias de hoy") o que una fecha cambie de formato.

- **Golden path:** home v1 y home v2 (`/v2/home`) muestran todos los textos traducidos, sin
  keys crudas visibles.
- Listado de asistencias (`/assistances`): textos + el día del `day-navigator` navegando
  adelante y atrás.
- Detalle y edición de cliente, alta de cliente, grupos.
- Stats: `/stats`, `/stats/customers`, `/stats/membership` y edición de un tipo de membresía.
- Expenses: alta y edición.
- Registro de asistencia desde el flujo de búsqueda.
- **Edge cases:** pantallas de auth (`/auth/login`, `/auth/error`, `/auth/sign-up-success`) —
  son las que llamaban `api.fetch` directo con casts desde `params`.
- **Regresión sospechosa (formato de fecha):** la fecha de "hoy" en el header v1, en el header
  v2 y en la card de asistencias del día debe verse en formato argentino y **coincidir entre
  las tres** (antes el card usaba `es-ES` y el header `es-AR`; ahora deben ser idénticas).
- **Regresión sospechosa (rutas API):** confirmar que `/api/accounting/*`, incluidas las
  dinámicas tipo `/api/accounting/payments/[id]`, siguen respondiendo. No se toca el rewrite,
  pero es el punto histórico de falla y cuesta un request verificarlo.

---

## Resultados de la implementación

*(2026-09-15 — completado en la rama `refactor/i18n-server-t`.)*

El plan se ejecutó completo. `npm run type-check` pasa sin errores y `npm run lint` queda
en 22 warnings / 0 errores, exactamente el baseline de `develop`: cero problemas nuevos.

### Desviaciones respecto del plan

- **`getIntlLocale()` NO vive en `server.ts`, sino en un módulo propio `src/lib/i18n/locale.ts`.**
  El plan lo ubicaba junto a `getServerT()`, pero [day-navigator.tsx](../../../src/assistance/day-navigator.tsx)
  es un client component y lo necesita: importarlo desde un módulo marcado server-only —
  que lee env vars no públicas — habría sido exactamente el footgun que el propio plan
  quería evitar. `locale.ts` es isomorfo a propósito y no importa nada de env.

- **Se agregó `formatTodayLongInAppTz()` a [src/lib/format-date.ts](../../../src/lib/format-date.ts).**
  No estaba en el plan. Al migrar aparecieron tres bloques `Intl.DateTimeFormat` casi
  idénticos para "hoy" (assistance-card-today, v2/layout, auth/header). Reemplazarlos por
  ternarios corregidos habría dejado la duplicación intacta, así que se extrajo la función
  canónica. Toma `dayStyle` porque v1 muestra "1 de agosto" y v2 "01 de Agosto" — se
  preservó la diferencia visual de cada versión en vez de unificarla por mi cuenta.

- **`I18nServerProvider` también perdió sus props.** El plan no lo mencionaba, pero recibía
  `lang`/`tenant` con el mismo propósito que los 12 componentes. Ahora resuelve vía
  `getServerT()`.

### Hallazgos nuevos durante la implementación

El relevamiento del plan quedó corto en cuatro puntos:

- **Eran 5 mapeos idioma→locale duplicados, no 3.** A los tres listados se suman
  [assistances-list.tsx:40](../../../src/assistance/assistances-list.tsx) (el mismo ternario)
  y [shareable-top-image.tsx](../../../src/assistance/shareable-top-image.tsx), que pasaba
  `lang` crudo (`'es'`) como locale a `toLocaleDateString` — no es un locale válido de
  región, así que daba formato genérico en vez de argentino.

- **Un sexto sitio derivaba `lang` de la URL, en client.**
  [membership/components/amounts.tsx](../../../src/membership/components/amounts.tsx) hacía
  `useParams()?.lang as Language` para pasárselo a `formatCurrency`. Se eliminó: el valor
  siempre era `'es'` (el rewrite lo fija) y `formatCurrency` ya default-ea a `'es'`, así que
  la salida es idéntica.

- **Bug de timezone en [auth/components/header.tsx](../../../src/auth/components/header.tsx).**
  Formateaba la fecha de "hoy" con `Intl.DateTimeFormat` **sin pasar `timeZone`**. En Vercel,
  que corre en UTC, eso muestra el día siguiente entre las 21:00 y la medianoche AR. No es
  cosmético como el `es-ES` que el plan sí había detectado: es el día equivocado en pantalla.
  No afecta datos persistidos — no toca helpers de `timezone.ts` ni fechas que se guarden —
  pero entra de lleno en la regla de fechas AR-aware del proyecto. Corregido al pasar por
  `formatTodayLongInAppTz()`.

- **`MetricsRow.tsx` derivaba un tipo de `i18n.fetch`** (`Awaited<ReturnType<typeof i18n.fetch>>['t']`).
  Ahora deriva de `getServerT`. Lo detectó el type-check, que fue efectivamente el mejor
  aliado del refactor como anticipaba el plan.

### Deuda que queda abierta

- **[src/lib/format-currency.ts](../../../src/lib/format-currency.ts) tiene su propio
  `type Language = 'es' | 'en'` duplicado y su propio ternario `lang === 'es' ? 'es-ES' : 'en-US'`**
  — un sexto mapeo, y con `es-ES` en vez de `es-AR`. No se tocó: es formato de moneda, lo
  consume media app y con `decimals: 0` ambos locales producen la misma salida
  (`500000` → `500.000`). Unificarlo con `getIntlLocale()` es un cambio chico pero merece su
  propia verificación visual sobre todos los montos. Queda anotado, no arreglado.

- **[src/lib/i18n/index.ts](../../../src/lib/i18n/index.ts) está 100% comentado** (el módulo de
  multi-idioma en runtime: `getBrowserLanguage`, `setLanguage`, etc.). Sigue sin consumers.
  Borrarlo o revivirlo es una decisión aparte.

### Nota para el próximo que agregue una page bajo `/v2/`

Las pages nuevas **no** deben declarar `params: Promise<{ lang; tenant }>` ni castear nada:
si necesitan traducir, `const { t } = await getServerT()` y listo. Ése es justamente el
motivo por el que este refactor se hizo antes de la fase 4 del
[plan v2](../../v2/PLAN.md) — que crea ~10 pages stub nuevas y habría multiplicado por
1.3 la superficie a migrar.
