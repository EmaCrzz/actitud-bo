# Listado de clientes v2 — query canónico compartido, filtros en la URL y scroll infinito

**Fecha:** 2026-09-16
**Autor:** ema_villanueva@hotmail.com
**Rama:** feat/v2-clientes

## Descripción

Primera mitad de la Fase 6 del [rediseño v2](../../v2/PLAN.md): la sección **Clientes** con data real, reemplazando el placeholder `UnderConstruction` que dejó la Fase 4.

La fase entera cubre dos cosas — el listado y el modal de perfil del cliente — pero **el modal quedó fuera de este PR a propósito**. La cuota del MCP de Figma (seat View, plan Professional) se agotó en la primera llamada de la sesión, así que de los 9 frames de la fase no se pudo verificar ninguno. El listado se puede construir sin adivinar: su estructura está en el árbol de nodos y la anatomía de la fila mobile quedó confirmada en la sección 2.4 del plan con las capturas del 2026-09-15. El modal de perfil, en cambio, son 5 frames de contenido desconocido (¿qué tabs? ¿qué datos?) y el dropdown de acciones de fila otro más — construirlos sin verlos sería inventar pantallas, que es justo lo que el plan prohíbe. Van a un PR 6b cuando estén los PNGs en `docs/v2/figma/`.

Lo entregado: búsqueda server-side, dos filtros, paginación por scroll infinito, estados vacío / cargando / error / sin-resultados, la fila mobile del Figma, y el link desde el card "Clientes activos del mes" del home aterrizando con el filtro aplicado.

## Decisiones

### Decisiones de negocio

- **El estado del cliente se deriva, no se guarda.** `customers` no tiene columna de activo/inactivo; el badge sale de `customer_membership.expiration_date` comparado contra el día calendario de Argentina. Un cliente **sin fila** en `customer_membership` es un tercer caso ("Sin membresía", badge neutral) que se muestra pero **no se puede filtrar** — ver la decisión técnica sobre PostgREST más abajo.
- **`expiration_date` nulo cuenta como vencida.** Es lo que ya devuelve `isExpiredInAppTz(null)`, que es quien pinta el badge. El filtro de estado replica esa regla en el `WHERE` para que filtro y badge nunca digan cosas distintas de la misma fila.
- **El card del home linkea al filtro que corresponde a su subtítulo**, no al listado completo: si hay membresías vencidas el subtítulo habla de ellas, así que el click cae en `?status=expired`; si no, en `?status=active`.
- **"Nuevo cliente" avisa "Próximamente".** El alta es la Fase 7. El botón existe porque el Figma lo tiene en la barra de filtros y su ausencia cambiaría el layout; el toast es el mismo que ya usaban las acciones rápidas del home.
- **Los dos dropdowns son `Estado` y `Membresías`** — se implementaron como inferencia (eran los dos ejes que el resto de la pantalla ya expone) y la captura del Figma que pasó Ema en la misma sesión los confirmó.
- **El listado no muestra teléfono ni DNI.** La primera pasada agregó una columna "Contacto" y el DNI bajo el nombre; el Figma no tiene ninguna de las dos y sí una columna **Asistencias** que faltaba. Se alineó a lo diseñado: mostrar menos de lo que el modelo permite es una decisión del diseño, no una omisión a corregir.

### Decisiones técnicas

- **Un solo query canónico en `src/customer/api/customers-query.ts`, que recibe el cliente de Supabase por parámetro.** Hasta esta fase el listado existía **dos veces**: `searchAllCustomers` en `api/server.ts` y `_fetchCustomersPage` en `api/client.ts`, con el mismo select, el mismo orden y la misma paginación escritos en paralelo. Agregar un filtro implicaba escribirlo dos veces, y nada garantizaba que no se desincronizaran. Ahora las dos funciones son wrappers de tres líneas sobre el mismo builder. Se descartó unificar por HTTP (una route handler que los dos consumieran) porque el server component perdería la consulta directa y agregaría un hop de red al render inicial.
- **Filtros server-side con joins embebidos de PostgREST, sin migración.** `SEARCH_CUSTOMER` pasa a traer `expiration_date` además del tipo, y hay una segunda variante `SEARCH_CUSTOMER_WITH_MEMBERSHIP` con `customer_membership!inner` porque **PostgREST sólo filtra por columnas de un recurso embebido si el join es inner**. Sin filtros se usa el left join, para que los clientes sin membresía también aparezcan.
  - Alternativa descartada: un RPC `search_customers_paginated` con los tres estados y `count` total. Es más expresivo — resolvería "sin membresía" y daría total de filas — pero cuesta una migración y el Figma no muestra ni paginador ni contador. Si "Sin membresía" termina siendo un estado real (brecha B13, Fase 7), ese es el momento de hacerlo.
- **"Vencida" se filtra con `.or()` sobre el recurso embebido**, no con un simple `lt`: `customer_membership.or=(expiration_date.is.null,expiration_date.lt."<iso>")`. Sin el `is.null`, las membresías sin fecha quedaban fuera del filtro pero seguían mostrando badge "Vencida". El valor va entre comillas dobles porque el ISO lleva `:` y `.`.
- **Scroll infinito, no paginador**, reusando el patrón que ya funciona en la lista v1 (`useInfiniteQuery` + `useIntersectionObserver` de `usehooks-ts`). Coherente con la decisión #4 del plan: `DataTable` no tiene paginación y ningún wireframe la muestra. `getNextPageParam` corta con la primera página incompleta, así no hace falta pedir `count` a Postgres.
- **Los filtros viven en la URL y se sincronizan con `window.history.replaceState`, no con `router.replace`.** `router.replace` re-ejecutaría el server component y volvería a traer la primera página que react-query ya tiene en cache, por cada tecla del search. `replaceState` deja la URL compartible y recargable sin navegación. El parseo es defensivo: un `?status=cualquier-cosa` no filtra en vez de romper la página.
- **Render inicial en el server + `initialData` condicional.** El server component pinta la primera página ya filtrada (sin flash de skeleton), y ese resultado se usa como `initialData` **sólo mientras los filtros sean los que el server usó** (`areSameCustomerFilters`). En cuanto cambian, cambia la query key y react-query consulta de verdad.
- **El builder lanza; el wrapper del server atrapa.** Lanzar es lo que necesita react-query para mostrar el estado de error del listado. En el server component, en cambio, un throw tiraría la página entera, así que `searchAllCustomers` loguea y degrada a lista vacía — el comportamiento que ya tenía la v1.
- **`MembershipTranslationShort` en `src/membership/consts.ts`.** `MembershipTranslation` trae el prefijo incluido ("Membresía: 5 días"), que en una columna ya titulada "Membresía" queda redundante, y en la fila mobile el prefijo lo pone la fila. Se agregó la variante corta al lado de las que ya existían, en el mismo archivo canónico, en vez de recortar el string en la UI.
- **El toast de "Próximamente" se movió a `v2.comingSoon.*` + `useComingSoonToast()`.** Estaba bajo `v2.home.quickActions.*`; consumirlo desde Clientes habría sido copy de home en otra sección. Un solo hook para poder borrar todos los call sites de una cuando las fases aterricen.

## Consideraciones de seguridad

- **Autenticación / Autorización:** sin cambios. La ruta hereda el layout de `/v2`, que verifica el feature flag `v2_access` y redirige a v1 si falta. Las consultas van con el cliente anon y RLS de siempre.
- **Exposición de datos:** el listado muestra nombre, DNI y teléfono — los mismos campos que ya muestra el listado v1, a los mismos usuarios autenticados. No se agregaron columnas al select más allá de `expiration_date`, que ya viajaba en otros endpoints.
- **Validación de input:** los tres filtros de la URL se validan contra listas cerradas (`MembershipStatusArray`, `MembershipTypeArray`) y lo que no matchea se descarta. El texto de búsqueda pasa por `normalizeSearchQuery` y va como parámetro de `ilike` vía supabase-js, que lo escapa — no hay concatenación de SQL. El ISO del filtro de fecha lo genera el server con `getTodayRangeInAppTz`, no viene del cliente.
- **Dependencias:** ninguna nueva. `use-debounce`, `usehooks-ts` y `@tanstack/react-query` ya estaban.
- **Infraestructura:** sin cambios. Ninguna migración, ninguna variable de entorno, ninguna ruta de API nueva.

## Auditoría de timezone

Obligatoria por fase según el plan. Fechas que toca este PR:

| Call site | Qué hace | Helper |
|---|---|---|
| `fetchCustomersPageWith` — filtro de estado | Corte entre activa y vencida | `getTodayRangeInAppTz().start`, igual que `getActiveMemberships`. Comparar contra `now()` perdería las membresías guardadas como medianoche UTC del día de hoy (21hs de ayer en AR) |
| `CustomerStatusBadge` | Badge Activo / Vencida de cada fila | `isExpiredInAppTz(expiration_date)`, que compara días calendario AR y no timestamps |
| Columna "Vencimiento" | Muestra la fecha | `formatDate`, que formatea con `timeZone: APP_TIMEZONE` explícito |

**Ninguna fecha de este PR se escribe en la DB** — el listado es read-only, así que no hay call site de `parseAppTzDateString`. El riesgo acá es de *lectura*: un corte mal calculado mostraría el estado equivocado durante las últimas 3 horas del día AR, que es exactamente lo que evita usar el inicio del día AR como pivote.

## Correcciones de la revisión visual

Ema pasó la captura del listado desktop (`2118:22308`) con la implementación ya funcionando. Seis diferencias, **cuatro de ellas en primitivas de la Fase 5** y por eso promovidas a convención del plan:

| # | Qué estaba mal | Dónde se arregló |
|---|---|---|
| 1 | La barra de filtros ocupaba dos filas (search+acción / dropdowns). El Figma la tiene en **una sola** en desktop | `FilterBar`: un contenedor `flex-wrap` + utilidades `order` en vez de dos contenedores. Mobile conserva las dos filas de la convención 2.1 |
| 2 | El trigger de los dropdowns decía "Todos los estados". El Figma muestra **el nombre del filtro** (`Estado`, `Membresías`) | `FilterDropdown`: el caso "todos" se renderiza a mano; Radix por default muestra el label del item seleccionado |
| 3 | El header de la tabla era una fila con borde inferior. El Figma es una **banda gris con esquinas redondeadas** | `DataTable`. Con `border-separate` el radius va en las celdas de los extremos: un `<tr>` no acepta `overflow: hidden` |
| 4 | El avatar de iniciales estaba sólo en mobile. El Figma **también lo tiene en la celda de nombre del desktop** | `DataTableAvatar`, extraído de `DataTableMobileRow` y exportado |
| 5 | Columnas inventadas ("Contacto", DNI bajo el nombre) y una faltante ("Asistencias") | `CustomersTable`: quedaron las cinco del Figma |
| 6 | El badge decía "Activo" y el plan "5 días" | "Activa", y dos records de nombres de plan — la tabla desktop dice "5 días semanales", la fila mobile "Membresía: 5 días" |
| 8 | Dos botones de limpiar en el search: la ✕ azul del sistema y la nuestra | El átomo `Input`: `[&::-webkit-search-cancel-button]:hidden`. Es el botón de cancelar que WebKit agrega a todo `type='search'`; se mantiene el `type` por semántica y se esconde el control nativo |
| 7 | **El primer intento de la fila única quedó roto**: los dos dropdowns se dibujaban encima del botón "Nuevo cliente" | `FilterDropdown` + `FilterBar`. Causa: `SelectTrigger` tiene `w-full` en su base, así que dentro de un contenedor `w-auto` cada trigger tomaba el 100% del contenedor y dos hermanos al 100% se desbordaban **superponiéndose** al hermano siguiente. Fix: ancho explícito de desktop en el dropdown (`sm:w-44`, y `sm:w-36` para Estado, que sólo muestra "Vencida"), que `twMerge` deja convivir con el `w-full` de mobile |

## Lecciones aprendidas

- **El query del listado estaba duplicado desde antes de la v2** y nadie lo había notado porque ninguna de las dos copias había cambiado nunca. Las duplicaciones silenciosas se descubren cuando aparece el primer requerimiento que las obliga a divergir.
- **`.or()` sobre un recurso embebido necesita `referencedTable`**, no el `or` plano — sin esa opción el filtro se aplica a la tabla padre y devuelve cualquier cosa. Se verificó la URL generada (`customer_membership.or=(...)`) inspeccionando `request.url` con un script descartable, sin pegarle a la DB. Vale como técnica para cualquier filtro PostgREST no trivial: es más rápido que levantar la app y más confiable que leer la doc.
- **Los átomos `w-full` se desbordan superponiéndose, no recortándose.** Es la cuarta vez en la v2 que un problema de estilo pasa `type-check` y `lint` sin una queja (van: `bg-primary-500` inexistente, el `!p-*` de los portales, el `min-h-0` del AppShell, y ahora esto). Todas comparten forma: **el compilador no sabe nada de layout**. La única red es mirar la pantalla, así que conviene pedir captura después de cada cambio de layout en una primitiva compartida, no sólo al cerrar la fase.
- **El árbol de nodos del Figma no alcanza para definir las columnas de una tabla.** Sirvió para el layout general (barra de filtros + tabla + estados), pero 3 de las 6 correcciones de la revisión visual fueron columnas: dos inventadas y una faltante. Para las fases con tabla que quedan (10, 11, 12, 14) conviene conseguir la captura **antes** de decidir columnas, no después de implementarlas.
- **El plan tenía un claim desactualizado:** la lista de convenciones afirmaba que `getServerT()` no existe y que en Server Components hay que usar `api.fetch(lang, tenant)`. `getServerT()` existe desde el PR #50 y es lo que usa todo v2. Corregido en el mismo PR. Es la **tercera** vez que un documento del repo fija como hecho algo no verificado (las dos anteriores están registradas en la Fase 4); conviene seguir chequeando los claims del plan al ejecutarlos en vez de confiarlos.

## Plan

### Pasos

1. Rama `feat/v2-clientes` desde `develop` (con Fase 5 ya mergeada, PR #52).
2. Extraer el query duplicado a `src/customer/api/customers-query.ts` y dejar server y client como wrappers.
3. Extender el select con `expiration_date` + variante `!inner` para poder filtrar por la membresía embebida.
4. `src/customer/filters.ts`: tipos, parseo y serialización de los filtros, compartidos entre el server component y la UI.
5. `CustomersTable` (columnas + fila mobile + estados), `CustomerFilters` (los dos dropdowns) y `CustomersSection` (search, scroll infinito, sync de URL).
6. Reemplazar el placeholder de `/v2/customers` por la página real, resolviendo la primera página en el server.
7. Linkear el card "Clientes activos del mes" del home con el filtro correspondiente.
8. `type-check` + `lint` en el baseline de `develop` (0 errores / 22 warnings).
9. ADR + actualización del plan v2: Fase 6 partida en 6a y 6b, con los nodos que quedaron sin verificar anotados.
