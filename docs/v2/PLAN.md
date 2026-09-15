# Rediseño v2 de Actitud BO — Plan de trabajo

> **Documento vivo.** Se actualiza a medida que se avanzan fases o surgen cambios de alcance/decisión. Sirve como contexto para futuras sesiones de Claude (o de otro dev): cualquier agente que arranque debería poder leerlo y saber por dónde continuar **sin volver a explorar el Figma ni el schema desde cero**.

## Cómo usar este documento

1. **Antes de arrancar una fase** — leé la sección de esa fase + [Fuentes de verdad](#fuentes-de-verdad) + [Brechas de base de datos](#brechas-de-base-de-datos).
2. **Durante la fase** — si algo del plan no matchea la realidad (el Figma cambió, el schema no da, apareció un edge case), **editá este archivo en el mismo PR**. No dejes que el plan se desactualice: es la única memoria compartida entre sesiones.
3. **Al cerrar la fase** — actualizá la tabla de [Estado / progreso](#estado--progreso), agregá la entrada en [Cambios registrados](#cambios-registrados) y linkeá el ADR.
4. **Convención de estado:** ⬜ pendiente · 🟡 en curso · ✅ completa · ⚠️ bloqueada · 🔵 diseño incompleto en Figma.

---

## Estado / progreso

| Fase | Título | Estado | Notas |
|------|--------|--------|-------|
| 0 | Infra de feature flags + scaffold v2 | ✅ completa | PR [#43](https://github.com/EmaCrzz/actitud-bo/pull/43). ADR [20260817111834](../architecture/decisions/20260817111834_v2-scaffold-and-feature-flags.md). |
| 1 | Design system v2 (tokens + primitives shadcn + AppShell) | ✅ completa | PR [#44](https://github.com/EmaCrzz/actitud-bo/pull/44). ADR [20260817114952](../architecture/decisions/20260817114952_v2-design-system-scoped-theming.md). |
| 1.5 | Sidebar colapsable + fixes responsive del AppShell | ✅ completa | PR [#45](https://github.com/EmaCrzz/actitud-bo/pull/45). Sin ADR nuevo: extiende fase 1. |
| 1.6 | Fixes de i18n, composition patterns e hidratación | ✅ completa | PR [#46](https://github.com/EmaCrzz/actitud-bo/pull/46). ADR [20260818111458](../architecture/decisions/20260818111458_v2-i18n-y-composition-fixes.md). |
| 2 | Home v2 (primera pantalla real) | ✅ completa | PRs [#47](https://github.com/EmaCrzz/actitud-bo/pull/47) y [#48](https://github.com/EmaCrzz/actitud-bo/pull/48). Search + métricas + daily summary + weekly attendance con data real. |
| 3 | Flow "Registrar asistencia" (modal + confirmación + toast) | ✅ completa *(con pendientes)* | PR [#49](https://github.com/EmaCrzz/actitud-bo/pull/49) mergeado en `develop` el 2026-08-19. ADRs [20260819130435](../architecture/decisions/20260819130435_v2-attendance-modal.md) + [20260819163000](../architecture/decisions/20260819163000_success-tick-animation.md) + [20260819170000](../architecture/decisions/20260819170000_busqueda-de-clientes-insensible-a-acentos.md). **Quedaron pendientes** (verificación contra Figma, duplicado de asistencia, loading de búsqueda) → ver [Fase 3](#fase-3--flow-registrar-asistencia); se resuelven como fase 3.1 o dentro de la fase que los toque. |
| 4 | Navegación v2 real (sidebar alineado al Figma + rutas stub) | ⬜ pendiente | Bloquea todas las fases de sección. Sidebar actual no matchea el Figma. |
| 5 | Primitivas transversales v2 (DataTable, FormModal, ConfirmDialog, FilterBar, DetailModal) | ⬜ pendiente | Bloquea fases 6–14. |
| 6 | Sección Clientes + Modal perfil de cliente | ⬜ pendiente | |
| 7 | Alta de cliente (desde Home y desde Clientes) | ⬜ pendiente | |
| 8 | Registrar pago / renovar membresía + comprobante | ⬜ pendiente | Flow más largo del Figma (10 pantallas). |
| 9 | Sección Asistencias | ⬜ pendiente | |
| 10 | Sección Membresías (planes y precios) | ⬜ pendiente | |
| 11 | Sección Gastos (crear/editar/eliminar) | ⬜ pendiente | Requiere migración: `payment_method` en `expenses`. |
| 12 | Sección Ventas (productos) | ⚠️ bloqueada | **No existe modelo de datos.** Requiere diseño de schema completo. |
| 13 | Balance | ⬜ pendiente | Depende de 11 y 12. |
| 14 | Configuración (Negocio / Membresías / Promociones / Usuarios) | ⬜ pendiente | Requiere tabla de settings del negocio. |
| 15 | Promoción de v2 a default + retiro de v1 | ⬜ pendiente | Fuera del alcance actual; se planifica cuando 3–14 estén cerradas. |

---

## Contexto

Actitud BO es hoy una PWA mobile-first sin diseño desktop. El rediseño completo vive en Figma y ya cubre **17 flows** en wireframes desktop de 1280×832. La v1 debe seguir disponible en producción todo el tiempo; la v2 se construye bajo `/[lang]/[tenant]/v2/*`, gateada por el feature flag `v2_access` por usuario.

**Qué introduce la v2:**

- **Layout desktop + mobile responsive.** Desktop: sidebar navegable de 255px (colapsable a 64px) + header + main como cards individuales. Mobile: shell con Sheet drawer.
- **Design system consolidado** — tokens tipo shadcn scopeados bajo `[data-v2='true']`, compatibles con el theming CSS-vars actual.
- **Cobertura funcional mayor que la v1** — la v1 no tiene Ventas, Balance ni Configuración de negocio. La v2 los introduce, y algunos requieren modelo de datos nuevo.

**Multitenant:** la app es tenant-configurable en build (env `TENANT`, temas y fuentes por tenant en [src/lib/themes/](../../src/lib/themes/)). La v2 hereda esto tal cual. Migrar la DB a multi-tenant en runtime (RLS por `tenant_id`) es una tarea aparte que no bloquea este plan.

**No hacemos ahora:** RLS por tenant en DB, i18n adicional (queda `es` como único idioma), tests automatizados (status quo del proyecto).

---

## Fuentes de verdad

### 1. Figma — índice de nodos

Archivo: `UTMwTtSd6xgjiZilI5DAbK` — página única **"Wireframes desktop"** (`2060:11533`).
Deep-link a cualquier nodo: `https://www.figma.com/design/UTMwTtSd6xgjiZilI5DAbK/?node-id=<id-con-guión>` (ej. `2060-11534`).

> **⚠️ Límite de cuota del MCP de Figma.** La cuenta tiene un seat **View** en plan Professional, con un tope bajo de llamadas al MCP. En la sesión del 2026-09-10 se agotó después de ~5 llamadas. **Consecuencia: de las 73 pantallas, sólo `P/Home` (`2060:11534`) fue inspeccionada visualmente.** Todo el resto del contenido de este plan viene del árbol de nodos (nombres de capa, jerarquía y tamaños), que es fiable para *estructura* pero no para *contenido exacto de textos, estados y microcopy*.
>
> **Regla operativa:** al arrancar cada fase, gastar la cuota disponible en los nodos de **esa** fase (están listados abajo) y volcar los hallazgos acá. No intentar barrer el archivo entero de una.

Nota sobre la nomenclatura del Figma: casi todos los frames se llaman `Home` independientemente de qué pantalla sean. **El nombre del frame no es confiable; lo que identifica la pantalla es la sección que lo contiene y su posición en la fila** (izquierda → derecha = avance del flow). Las flechas (`Arrow N`) entre frames marcan las transiciones.

| # | Sección (flow) | Node ID | Título en Figma | Pantallas | Node IDs de las pantallas (en orden del flow) |
|---|---|---|---|---|---|
| 1 | Registrar asistencia | `2166:22896` | "Registrar asistencia" | 7 | `2060:11534` (Home) → `2064:14532` (Búsqueda) → `2065:15004` (Búsqueda/Loading) → `2065:16139` (Modal asistencias) → `2117:5939` (Registro) → `2117:8258` (Toast éxito) → `2117:8533` (Home actualizado) |
| 2 | Crear nuevo cliente (desde Home) | `2166:22897` | "Desde el home" | 7 | `2117:8757` → `2117:8942` → `2117:9198` → `2117:9868` → `2117:10128` → `2117:10405` (Toast) → `2117:12773` |
| 3 | Registrar un pago (desde Home) | `2166:22898` | "Desde el home registrar un pago" | 10 | `2117:12960` → `2117:13145` → `2117:14238` → `2117:15278` → `2118:16213` → `2118:16942` → `2118:17345` → `2118:17604` (Modal Dialog) → `2118:17883` (Payment Receipt) → `2118:18209` |
| 4 | Estado del home | `2166:22899` | "Home con datos del día" | 1 | `2118:18398` |
| 5 | Sección clientes | `2167:22900` | "Pantalla de clientes y Card de clientes del mes desde el home" | 3 | `2118:22308` → `2118:22594` (Dropdown de acciones) → `2118:22907` (Customer Detail Modal) |
| 6 | Modal perfil cliente | `2167:22901` | "Perfil de cliente" | 5 | `2118:25405` → `2118:23254` → `2118:23600` → `2118:24441` → `2118:24959` |
| 7 | Modal renovar membresía | `2167:22902` | "Renovar membresía desde Cliente/Perfil" | 7 | `2118:25691` → `2118:26041` → `2118:26479` → `2118:26919` → `2118:27273` → `2118:27698` (Modal Dialog) → `2118:28076` (Payment Receipt) |
| 8 | Crear cliente desde Clientes | `2167:22903` | "Crear nuevo cliente desde Clientes" | 4 | `2118:28450` → `2110:25665` → `2110:26658` → `2110:27462` (Toast) |
| 9 | Sección asistencias | `2167:22904` | "Asistencias desde Card del home y sección asistencias" | 2 | `2118:28921` (Tabs + Customer List) → `2118:28933` (con DateNavigation) |
| 10 | Sección membresías | `2167:22905` | "Membresías Editar/Crear" | 4 | `2118:34043` → `2125:28702` → `2125:31710` → `2125:32285` (Toast) |
| 11 | Ventas a clientes | `2167:22906` | "Venta de productos a clientes" | 5 | `2125:32778` → `2131:50779` → `2133:56520` → `2133:56989` → `2136:63491` |
| 12 | Ventas a no clientes | `2167:22907` | "Venta de productos a no clientes" | 3 | `2136:66687` → `2136:66962` → `2137:70456` |
| 13 | Exportar archivo (Ventas) | `2167:22908` | "Exportar archivo" | 2 | `2139:17650` → `2139:17917` (Modal Dialog) |
| 14 | Gastos crear/editar | `2167:22910` | "Gastos crear/editar" | 6 | `2139:18300` → `2140:31470` → `2141:34792` (Toast) → `2141:35010` → `2141:35304` → `2141:49230` (Toast) |
| 15 | Eliminar gastos | `2167:22911` | "Eliminar gastos creados" | 3 | `2141:49458` → `2141:49736` (Modal Dialog) → `2141:50232` (Toast) |
| 16 | Balance | `2167:22912` | "Balance" | 1 | `2141:50936` |
| 17 | Configuración | `2167:22913` | "Configuración" | 3 | `2141:51590` (Negocio) → `2151:58342` (tabla) → `2151:68169` (tabla) |

**Anotaciones sueltas en el canvas** (textos que el diseñador dejó al lado de los frames, revisar al abrir cada sección):
- `2118:22319` — "Ver estados de las tablas" (sección Clientes)
- `2118:22606` — "Ver estados" (sección Clientes)
- `2118:29353` — "Ver estados del historial" (sección Asistencias)

Estos tres marcan **estados de tabla/lista que el diseño todavía no cubre** (vacío, cargando, error, sin resultados). Ver [Decisiones abiertas](#decisiones-abiertas--riesgos) #3.

### 2. Figma — índice de nodos mobile

Mismo archivo `UTMwTtSd6xgjiZilI5DAbK`, **segunda página: "Wireframes mobile"** (`2167:22916`). Viewport 390×844 (iPhone 14/15). Frames más altos que 844 son pantallas con scroll.

> Nota: al listar las páginas del archivo la API devolvió sólo "Wireframes desktop". La página mobile existe y responde bien si se la consulta por node ID directo. **Si en el futuro falta una página, consultar el node ID en vez de confiar en el listado.**

| # | Sección (flow) | Node ID | Título en Figma | Pantallas | Node IDs (en orden del flow) | Fase |
|---|---|---|---|---|---|---|
| M1 | Registrar asistencias | `2222:43033` | "Búsqueda de cliente y registrar asistencias" | 4 | `2174:24784` (Home + drawer abierto) → `2175:25752` (Home scroll) → `2175:25926` (búsqueda con resultados) → `2175:26167` (Customer Detail Modal) | 3 |
| M2 | Crear cliente | `2222:43030` | "Crear nuevo cliente desde acciones rápidas" | 3 | `2175:28527` (Home) → `2175:28633` → `2175:29398` (FormModal, 2 pasos) | 7 |
| M3 | Renovar membresía | `2222:43026` | "Renovar membresía desde acciones rápidas" | 6 | `2175:29757` (Home) → `2175:29863` → `2183:39583` → `2183:43533` → `2183:43669` (FormModal, 4 pasos) → `2183:43825` (+ Modal Dialog) | 8 |
| M4 | Sección clientes | `2222:43027` | "Pantalla de clientes y perfil" | 7 | `2201:58513` (Home + drawer) → `2201:58764` → `2222:42619` (listado) → `2222:42876` → `2222:43096` → `2228:45514` → `2228:47961` (Detail Modal, 4 vistas) | 6 |
| M5 | Sección asistencias | `2228:49268` | "Total de asistencias" | 2 | `2228:48632` → `2228:48923` | 9 |
| M6 | Sección membresías | `2265:69683` | "Membresías Editar/Crear" | 3 | `2246:49888` (tabla + CTA sticky) → `2260:65170` → `2265:69496` (FormModal) | 10 |
| M7 | Ventas a clientes | `2286:118422` | "Venta de productos a clientes" | 5 | `2265:70904` (vacío, $0) → `2277:96065` (con data) → `2286:117668` → `2286:118017` → `2286:118321` (FormModal, 3 pasos) | 12 |
| M8 | Ventas a no clientes | `2286:118789` | "Venta de productos a no clientes" | 2 | `2286:118518` → `2286:118637` | 12 |
| M9 | Exportar archivo | `2286:118889` | "Exportar archivo" | 2 | `2286:118988` → `2286:119150` (+ Modal Dialog) | 12 |
| M10 | Sección gastos | `2286:119425` | "Crear/editar y eliminar" | 5 | `2286:119862` (**Gastos/Vacío**) → `2286:119451` (Nuevo) → `2329:29053` (con data) → `2329:29377` (Editar) → `2329:29602` (Eliminar + Modal Dialog) | 11 |
| M11 | Balance | `2345:37294` | "Balance" | 1 | `2329:30598` (390×1071, scroll) | 13 |
| M12 | Configuraciones | `2345:37297` | "Negocio/Membresías/Promociones" | 3 | `2333:33003` (Negocio) → `2333:37880` (Membresías) → `2333:38036` (Promociones) | 14 |

### 2.1 Convenciones de layout mobile (derivadas del árbol de nodos)

Estas reglas se repiten en las 12 secciones y deben respetarse en toda pantalla v2 mobile:

- **Grilla:** viewport 390, `Main Container` a 390, padding lateral 16px → **contenido útil 358px**. Los frames de 1331px de alto son scroll vertical, no pantallas separadas.
- **Header:** 390×68, misma altura que desktop.
- **Sidebar = drawer, no columna.** En mobile el `Sidebar` es una instancia de **260×844 sobre un overlay** (`Rectangle 3` 390×844). Visible en `2174:24784` y `2201:58513`. Confirma la decisión de fase 1 de usar `Sheet`, con ancho 260 (no el 255 de desktop).
- **`Customer Detail Modal` y `Modal / Membership Form` son full-screen 390×844**, no bottom sheets parciales. Esto **corrige el supuesto de la Fase 5**, que asumía bottom sheet.
- **`Modal Dialog` sí es overlay centrado:** 358 de ancho, alto variable según contenido (229 en eliminar gasto, 282 en renovar membresía, 296 en exportar).
- **KPIs tienen dos tratamientos distintos:**
  - Home y Balance → `Metric Card` **apiladas** a 358 de ancho (94px c/u en Home; 106/106/92 en Balance).
  - Ventas y Gastos → **fila de 3 `Paragraph` compactos** de 93px, embebidos dentro del bloque `Search field`. No son cards.
- **Acción primaria comprimida a ícono:** lo que en desktop es un botón con texto de 177px, en mobile es el `New Client Button` de **40×36 icon-only** al lado del `Search Bar` (306px). Aplica en Clientes, Ventas y Gastos.
- **CTA sticky al fondo:** `Container` 389×85 con un botón de 341×36, anclado abajo. Aparece en Membresías (`2246:49888`) y Promociones (`2333:38036`).
- **Filtros:** los `Dropdown` bajan a 32px de alto y se reparten el ancho — 2 filtros → 159px c/u; 3 filtros → 108.67px c/u.
- **`Data Table` en mobile ocupa 358–390 de ancho y 481–544 de alto.** Existe como instancia, así que el diseñador definió alguna degradación. **Verificar visualmente en Fase 5 antes de diseñar el componente** — es la incógnita más importante que queda.

### 2.2 Diferencias mobile ↔ desktop que cambian el alcance

No son adaptaciones de layout: son **cambios de navegación y de funcionalidad**.

| Tema | Desktop | Mobile | Impacto |
|---|---|---|---|
| **Asistencias** | `Tabs` + `DateNavigation` opcional (`2118:28921`, `2118:28933`) | **Sin Tabs.** `DateNavigation` siempre presente (`2228:48632`) | Fase 9: definir si los tabs desaparecen también en desktop o si es divergencia intencional |
| **Configuración** | 4 sub-items en el sidebar (Negocio, Membresías, Promociones, **Usuarios**) | **`Tabs` dentro de la pantalla**, y **sólo 3: falta Usuarios** | Fase 14: dos patrones de navegación distintos + una pantalla sin diseñar |
| **Payment Receipt** | Presente en flows 3 y 7 (`2118:17883`, `2118:28076`) | **No aparece en ningún flow mobile** | Fase 8: ¿el comprobante no existe en mobile, o falta diseñarlo? |
| **Pago desde el Home** | "Registrar un pago", 10 pantallas (`2166:22898`) | "Renovar membresía desde acciones rápidas", 6 pantallas (`2222:43026`) | Fase 8: confirmar si son el mismo flow con menos pasos o dos flows distintos |
| **Alta de cliente** | Dos secciones separadas: desde Home (7 pantallas) y desde Clientes (4) | Una sola sección de 3 pantallas + el botón icon-only en Clientes | Fase 7: mobile sugiere que es **un** formulario con dos entradas, lo que valida el enfoque del plan |
| **Estado vacío** | Sin diseñar (3 anotaciones "ver estados") | **`Gastos/Vacío` (`2286:119862`) y Ventas en $0 (`2265:70904`) sí están diseñados** | Fase 5: usar estos dos como referencia canónica de empty state |
| **Copy de KPIs en Gastos** | "Total de gastos" (`2139:18310`) | **"Total cobrado"** (`2286:119875`, `2329:29066`) | Probable copy heredado del componente de Ventas sin ajustar. Usar "Total de gastos" y avisar al diseñador |

**Flows desktop sin equivalente mobile:** "Estado del home" (`2166:22899`) — cubierto de hecho por los Home de las otras secciones — y "Crear cliente desde Clientes" (`2167:22903`), cubierto por el botón icon-only del listado.

### 3. Protocolo de trabajo con el Figma (obligatorio por fase)

La cuota del MCP de Figma es el recurso escaso (seat View en plan Professional: ~5 llamadas antes de cortar). El índice de nodos de arriba existe para gastarla bien.

**Al arrancar cada fase, en este orden:**

1. **Abrir los dos nodos-sección del flow — desktop y mobile** (columna "Node ID" de las tablas de arriba) y recorrer sus pantallas en orden. No barrer el archivo entero: sólo los nodos de *esta* fase. Toda fase tiene ambas referencias salvo las excepciones listadas en [2.2](#22-diferencias-mobile--desktop-que-cambian-el-alcance).
2. **Volcar los hallazgos en la sección de la fase de este documento** — microcopy exacto, estados, variantes, comportamiento de los dropdowns, todo lo que el árbol de nodos no dice. Es lo que convierte una fase "inferida" en una fase "verificada".
3. **Marcar en la tabla de estado** que el diseño de la fase está verificado.
4. **Recién ahí implementar.**

**Si la cuota corta a mitad:** anotar en la sección de la fase qué nodos quedaron sin ver, y no implementarlos a ciegas. Mejor una fase parcial y honesta que una pantalla inventada.

**Alternativa recomendada a racionar cuota:** exportar los frames a PNG una sola vez desde Figma a `docs/v2/figma/{flow}/{node-id}.png` y commitearlos. Cualquier sesión futura los lee del repo sin gastar cuota, quedan versionados junto al plan, y el plan deja de depender de que el archivo de Figma no se mueva. Ver [Decisiones abiertas](#decisiones-abiertas--riesgos) #10.

### 4. Schema de base de datos

Snapshot en [src/lib/supabase/shemema.txt](../../src/lib/supabase/shemema.txt) (nota: el archivo tiene un typo en el nombre — `shemema`). Tablas actuales:

`assistance` · `customers` · `customer_membership` · `customer_groups` · `customer_group_members` · `types_memberships` · `membership_payments` · `discount_rules` · `expenses` · `profile` · `user_roles` · `user_feature_flags`

RPCs en uso desde el código: `get_membership_stats`, `get_top_customers_current_month`, `upsert_customer_membership_with_payment`, `upsert_customer_with_membership`.

El análisis de qué falta está en [Brechas de base de datos](#brechas-de-base-de-datos).

---

## Estrategia general

1. **Coexistencia paralela en el mismo repo.** V1 en `/[lang]/[tenant]/*`, v2 en `/[lang]/[tenant]/v2/*`. Hereda middleware, i18n, tenant, theming y auth. El flag `v2_access` decide quién ve v2.
2. **Componentes co-located por dominio.** Componentes compartidos entre dominios → `src/components/v2/`. Domain-specific → `src/[domain]/components/v2/`. La lógica de `src/[domain]/api/{client,server}.ts`, hooks, types y `src/lib/*` se comparte sin duplicar.
3. **Rollout por flow completo, no por pantalla suelta.** Cada fase entrega un flow del Figma end-to-end (entrada → estados intermedios → confirmación → feedback). Media pantalla no se mergea.
4. **Reuso agresivo de la lógica v1.** Antes de escribir cualquier función nueva de datos: buscar en `src/[domain]/api/server.ts` y `src/lib/*`. Si existe una versión v1, se reusa; si hay que cambiarla, se cambia en el lugar canónico (no se duplica en `v2/`).
5. **i18n obligatorio desde el día 1.** Todo string visible pasa por `useTranslations()` (client) o `const { t } = await api.fetch(lang, tenant)` (server). Namespace `v2.*` en `es.json` / `en.json`. Overrides tenant-específicos en `dictionaries/tenant/{tenant}.json`.
6. **Fechas AR-aware, sin excepciones.** Cualquier fecha que llegue a un RPC o a la DB pasa por [src/lib/timezone.ts](../../src/lib/timezone.ts). Ver [Regla crítica de timezone](#regla-crítica-de-timezone).
7. **DB primero cuando hay brecha.** Si un flow necesita columnas o tablas nuevas, la migración se diseña, se discute y se aplica en dev **antes** de escribir la UI. No se construye UI contra un modelo que no existe.

### Regla crítica de timezone

El negocio opera en `America/Argentina/Buenos_Aires` (UTC-3); Vercel corre en UTC. Un string crudo del datepicker (`"YYYY-MM-DD"`) enviado a supabase-js se interpreta como midnight UTC y queda 3 horas antes del intent, desalineando el mes contable. Es un bug **silencioso**.

Helpers obligatorios:

| Necesidad | Helper |
|---|---|
| String del datepicker → timestamp | `parseAppTzDateString(iso).toISOString()` |
| "Hoy" como ISO date | `getTodayIsoDateInAppTz()` |
| Rango del mes actual | `getMonthRangeInAppTz()` |
| Rango del día actual | `getTodayRangeInAppTz()` |
| ¿Venció? | `isExpiredInAppTz(date)` |
| Días hasta una fecha | `daysUntilInAppTz(date)` |

**Cada fase de este plan tiene una fila "Riesgo timezone" — no se cierra la fase sin auditarla.** Contexto histórico: ADR [20260709153000](../architecture/decisions/20260709153000_representacion-canonica-de-fechas-ar.md), sección "Reincidencia 2026-07-29" (91 pagos históricos desalineados por no aplicar la regla en un call site nuevo).

---

## Inventario de componentes compartidos v2

Componentes que el Figma instancia repetidamente a lo largo de los 17 flows. La columna "Estado" refleja el código en `develop` + rama actual.

| Componente Figma | Aparece en | Estado en código | Archivo destino |
|---|---|---|---|
| `Sidebar` | Todas las pantallas | ✅ existe | [src/components/v2/AppSidebar.tsx](../../src/components/v2/AppSidebar.tsx) — **desalineado con el Figma**, ver Fase 4 |
| `Header` | Todas las pantallas | ✅ existe | [src/components/v2/Header.tsx](../../src/components/v2/Header.tsx) — falta campana de notificaciones |
| `Metric Card` | Home, Balance | ✅ existe | [src/components/v2/MetricCard.tsx](../../src/components/v2/MetricCard.tsx) |
| `Card` (resumen/agenda) | Home, Balance | ✅ existe (parcial) | `DailySummaryCard.tsx`, `WeeklyAttendanceCard.tsx` |
| `Input Search` | Home, Clientes, Ventas, Gastos | ✅ existe | `AttendanceSearchCard.tsx` — extraer a genérico en Fase 5 |
| `Input Search Group` | Flow asistencia (search + resultados) | ✅ existe | dentro de `AttendanceSearchCard.tsx` |
| `Buttons` | Todas | ✅ shadcn `Button` | [src/components/ui/button.tsx](../../src/components/ui/button.tsx) |
| `Toast` | Flows 1, 2, 8, 10, 14, 15 | ✅ `sonner` | [src/components/ui/sonner.tsx](../../src/components/ui/sonner.tsx) |
| `Customer Detail Modal` | Flows 1, 5, 6, 7 | 🟡 parcial | `src/home/components/v2/AssistanceModal.tsx` es una variante; el genérico es de Fase 6 |
| **`Data Table`** | Flows 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17 | ❌ **no existe** | `src/components/v2/DataTable.tsx` — **Fase 5, la pieza más reusada del rediseño** |
| **`Dropdown`** (filtro / acciones de fila) | Flows 5, 6, 7, 11–17 | ⚠️ hay `dropdown-menu` y `select` shadcn, falta el wrapper de filtro | `src/components/v2/FilterDropdown.tsx` — Fase 5 |
| **`Modal / Membership Form`** | Flows 2, 3, 7, 8, 10, 11, 12, 14 | ❌ no existe | `src/components/v2/FormModal.tsx` — Fase 5. **Ojo: pese al nombre, es el shell genérico de formulario en modal, no algo de membresías.** |
| **`Modal Dialog`** (confirmación) | Flows 3, 7, 13, 15 | ⚠️ hay `alert-dialog` shadcn | `src/components/v2/ConfirmDialog.tsx` — Fase 5 |
| **`Payment Receipt`** | Flows 3, 7 | ❌ no existe | `src/membership/components/v2/PaymentReceipt.tsx` — Fase 8 |
| `Tabs` | Flow 9 | ✅ shadcn `Tabs` | [src/components/ui/tabs.tsx](../../src/components/ui/tabs.tsx) |
| `Customer List` | Flow 9 | ❌ no existe | `src/assistance/components/v2/CustomerList.tsx` — Fase 9 |
| `DateNavigation` | Flow 9 | ⚠️ existe v1 | [src/assistance/day-navigator.tsx](../../src/assistance/day-navigator.tsx) — portar |
| `Form Input` | Flow 17 | ✅ shadcn `Input` + `Label` | — |
| `ImageUpload` | Flow 17 | ❌ no existe | `src/components/v2/ImageUpload.tsx` — Fase 14. Requiere Supabase Storage |

**Regla de extracción:** un componente pasa a `src/components/v2/` cuando lo consumen **dos o más dominios**. Hasta entonces vive en el dominio. Es la regla que ya cristalizó el ADR de fase 1 y sigue vigente.

---

## Brechas de base de datos

Comparación entre el schema actual y lo que exigen los 17 flows. **Ninguna de estas migraciones está aplicada.**

### A. Bloqueantes duros (no se puede construir la UI sin esto)

#### A1. Ventas / productos — no existe modelo (Fase 12)

Los flows 11–13 muestran una sección Ventas con KPIs de "Total cobrado / Efectivo / Transferencias", tabla de ventas, filtros por 3 dropdowns, venta a cliente y venta a no-cliente, y export. **No hay ninguna tabla que soporte esto.**

Propuesta a discutir antes de implementar:

```sql
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  price real NOT NULL CHECK (price >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id),   -- NULL = venta a no cliente
  buyer_name varchar,                                  -- sólo si customer_id IS NULL
  total_amount real NOT NULL CHECK (total_amount >= 0),
  payment_method varchar NOT NULL
    CHECK (payment_method IN ('PAYMENT_CASH','PAYMENT_TRANSFER')),
  sale_date timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_buyer_check CHECK (customer_id IS NOT NULL OR buyer_name IS NOT NULL)
);

CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price real NOT NULL CHECK (unit_price >= 0),  -- snapshot del precio al momento de la venta
  subtotal real NOT NULL CHECK (subtotal >= 0)
);
```

Preguntas abiertas antes de escribir esto: ¿hay control de stock? ¿se puede editar/anular una venta? ¿el precio del producto se versiona o alcanza el snapshot en `sale_items.unit_price`? → [Decisiones abiertas](#decisiones-abiertas--riesgos) #5.

#### A2. Configuración del negocio — no existe tabla (Fase 14)

El flow 17 (`2141:51590`) muestra un form "General Information" con 4 `Form Input` (probablemente nombre, dirección, teléfono, email) + `ImageUpload` para el logo. No hay dónde guardarlo.

```sql
CREATE TABLE public.business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  address varchar,
  phone varchar,
  email varchar,
  logo_url varchar,
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Decisión previa: ¿fila única, o `tenant_id` desde ya para no migrar dos veces cuando llegue el 2do tenant? → [Decisiones abiertas](#decisiones-abiertas--riesgos) #6.
El logo además necesita un bucket de Supabase Storage con su política de acceso.

### B. Brechas de columna (la tabla existe pero le falta algo)

| # | Tabla | Falta | Por qué | Fase |
|---|---|---|---|---|
| B1 | `expenses` | `payment_method` | Los flows 14–16 muestran KPIs "Efectivo / Transferencias" en Gastos y en Balance. Hoy `expenses` no distingue medio de pago, así que ese desglose **no se puede calcular**. | 11 |
| B2 | `expenses` | `deleted_at` (o hard delete confirmado) | El flow 15 es "Eliminar gastos creados". Hoy `deleteExpense` hace hard delete. Decidir si el rediseño quiere papelera o borrado definitivo. | 11 |
| B3 | `membership_payments` | `receipt_number` | Los flows 3 y 7 terminan en un `Payment Receipt`. Un comprobante sin número identificable es difícil de referenciar después. | 8 |
| B4 | `assistance` | UNIQUE parcial `(customer_id, fecha-en-AR)` | Nada impide registrar dos asistencias del mismo cliente el mismo día. El flow 1 no muestra manejo de duplicado. | 3 |
| B5 | `customers` | `person_id` sin UNIQUE | Se pueden dar de alta dos clientes con el mismo DNI. Los flows 2 y 8 (alta de cliente) deberían detectarlo. | 7 |
| B6 | `types_memberships` | `active`, `description` | El flow 10 es un CRUD de planes de membresía. Sin `active` no se puede discontinuar un plan sin romper el histórico de pagos que lo referencian. | 10 |
| B7 | `discount_rules` | `valid_from`, `valid_to` | La sección Configuración → Promociones sugiere promos con vigencia. Hoy sólo hay `active` booleano. | 14 |
| B8 | `profile` | `email` | Configuración → Usuarios necesita mostrar/invitar por email. Hoy el email vive sólo en `auth.users`. | 14 |
| B9 | — | tabla de notificaciones | El header del Figma tiene campana con badge. No hay modelo. Puede resolverse como derivado (membresías por vencer) sin tabla. | 4 |

### C. Defecto latente detectado en el schema actual

**`membership_payments.payment_method` tiene `DEFAULT 'efectivo'` pero el CHECK sólo admite `'PAYMENT_CASH'` / `'PAYMENT_TRANSFER'`.**

```sql
payment_method character varying DEFAULT 'efectivo'::character varying
  CHECK (payment_method::text = ANY (ARRAY['PAYMENT_CASH'::text, 'PAYMENT_TRANSFER'::text]))
```

Cualquier `INSERT` que **omita** `payment_method` toma el default `'efectivo'`, viola el CHECK y falla. [`createMembershipPayment`](../../src/accounting/api/server.ts) inserta `paymentData` con `payment_method` opcional (`CreateMembershipPaymentData.payment_method?: string`), así que el camino de falla existe hoy.

No se rompió todavía porque los call sites actuales siempre mandan el método. **Verificar en dev antes de tocar el flow de pagos (Fase 8)** y, si se confirma, arreglar el default en la misma migración. No es parte de la v2 pero se cruza con ella.

---

## Fases 0–2 (histórico)

Cerradas. El detalle de implementación vive en los ADRs linkeados en la tabla de estado. Lo que queda como **convención vigente** para todo lo que venga:

- **Theming scoped:** los tokens del Figma viven en `globals.css` bajo `[data-v2='true']` y sobreescriben las mismas CSS vars que emiten los tenants v1, así los primitives shadcn ya instalados funcionan sin cambios.
- **Layout AppShell:** NO usar `variant='inset'` de shadcn Sidebar. Layout custom: `<SidebarProvider>` → `<aside className='rounded-lg bg-primary-contrast border w-[255px]'>` inline en desktop / `<Sheet>` en mobile, + `<main>` con `pl-6 lg:pl-12`. `AppSidebar` es contenido puro, sin wrapper `<Sidebar>`.
- **Header, Sidebar y Main son cards individuales** (rounded-lg + border + `bg-primary-contrast`) sobre fondo blanco.
- **Padding externo del viewport** en `globals.css` sobre `[data-v2]`: `1rem 1.5rem` mobile, `2rem 3rem` desktop (≥1024).
- **`data-v2='true'` hay que propagarlo explícitamente a cualquier primitive que renderice via portal** (`Sheet`, `Dialog`, `Popover`, `DropdownMenu`). Radix monta fuera del wrapper `[data-v2]` y sin eso hereda la paleta del tenant v1.
- **Nada de `useIsMobile()` para decidir qué se monta.** Causa flash de hidratación. Gate por CSS (`hidden md:flex`) y dejar ambos montados.
- **Wrappers dentro del AppShell necesitan `flex-1 w-full min-w-0`**, si no colapsan al mínimo de sus children en pantallas anchas.
- **Formatear fechas en el server y pasar strings al client.** `format(new Date(), ...)` dentro de un `'use client'` genera hydration mismatch y arrastra `date-fns/locale/es` al bundle.
- **Sub-componentes explícitos en vez de mega-render con ramas inline** (regla `patterns-explicit-variants`).
- **`getServerT()` / `getServerTranslations()` no existen** (el `examples.md` está desactualizado). En Server Components: `import { api } from '@/lib/i18n/api'` → `const { t } = await api.fetch(lang, tenant)`.

---

## Fase 3 — Flow "Registrar asistencia"

**Estado:** ✅ mergeada en `develop` (PR [#49](https://github.com/EmaCrzz/actitud-bo/pull/49), 2026-08-19) · **con pendientes abajo**
**Figma:** desktop `2166:22896` (7 pantallas) · **mobile `2222:43033` (4 pantallas)**.

### Qué ya está hecho

Los 3 commits de `feat/v2-attendance-modal` están en `origin/develop`, no en `main` (main quedó en el release v0.11.0):

- `src/home/components/v2/AssistanceModal.tsx` (424 líneas) — modal de registro con datos del cliente, slots semanales según `SLOTS_BY_TYPE`, aviso de membresía vencida, confirmación optimista y `SuccessTick` animado.
- `src/components/SuccessTick.tsx` (352 líneas) — animación de éxito sin dependencias externas. ADR [20260819163000](../architecture/decisions/20260819163000_success-tick-animation.md).
- `AttendanceSearchCard.tsx` — search conectado con resultados y selección.
- Búsqueda de clientes insensible a acentos — migración `20260819170000_customer_search_unaccent.sql` + `src/lib/utils/text.ts`. ADR [20260819170000](../architecture/decisions/20260819170000_busqueda-de-clientes-insensible-a-acentos.md).
- Helpers nuevos: `buildWeekSlots` en `src/assistance/utils.ts`, `formatDayLabelInAppTz` / `formatTimeInAppTz` en `src/lib/format-date.ts`, `getInitials` en `src/lib/format-person.ts`.

### Qué falta para cerrar la fase

1. **Verificar contra el Figma real.** Ninguna de las 6 pantallas desktop más allá del home fue inspeccionada visualmente, ni ninguna de las 4 mobile. Nodos a abrir, en orden de prioridad:
   - Desktop: `2065:16139` (modal) → `2117:5939` (registro) → `2117:8258` (toast) → `2064:14532` + `2065:15004` (búsqueda y su loading).
   - Mobile: `2175:26167` (Customer Detail Modal full-screen) → `2175:25926` (búsqueda con resultados) → `2175:25752` (home scroll).
   - **El `AssistanceModal.tsx` actual usa `Sheet`.** El mobile del Figma es full-screen 390×844, así que probablemente esté bien — pero verificar `2175:26167` antes de darlo por cerrado.
2. **Estado de loading de la búsqueda** (`2065:15004`). Confirmar si es skeleton de filas o spinner, y si el input queda deshabilitado.
3. **Duplicado de asistencia** (brecha B4). Hoy nada impide registrar dos veces el mismo día. Definir: ¿el modal bloquea el botón si ya hay asistencia hoy, o se agrega el UNIQUE parcial en DB y se maneja el error? Recomendación: **ambos** — UX que previene + constraint que garantiza.
4. **Toast de éxito** (`2117:8258`). Verificar copy, duración y si es global (`sonner`) o inline.
5. **Refresh del home post-registro.** Confirmar que "Asistencias de hoy", "Resumen del día" y "Asistencias semanal" se actualizan sin full reload.

### Datos y API

| Necesidad | Dónde está |
|---|---|
| Buscar cliente | `useCustomerSearch` + `searchAllCustomers` ([src/customer/api/server.ts](../../src/customer/api/server.ts)) |
| Datos del cliente para el modal | `fetchCustomerModalData` ([src/assistance/api/client.ts](../../src/assistance/api/client.ts)) |
| Crear asistencia | `createAssistance` ([src/assistance/api/client.ts](../../src/assistance/api/client.ts)) |
| Asistencias de la semana | `getAssistancesByWeek` ([src/assistance/api/server.ts](../../src/assistance/api/server.ts)) |
| Métricas del home | `getHomeMetrics`, `getDailySummary`, `getWeeklyAttendanceSummary` ([src/home/api/server.ts](../../src/home/api/server.ts)) |

**Riesgo timezone:** alto. `assistance_date` define a qué día contable pertenece el registro y alimenta las tres métricas del home. Auditar que `createAssistance`, `getAssistancesByWeek` y `buildWeekSlots` usen `getTodayRangeInAppTz` / `isSameDayInAppTz` y no comparaciones UTC.

**Definición de hecho:**
- [ ] Las 6 pantallas restantes verificadas contra el Figma
- [ ] Duplicado de asistencia resuelto (UX + constraint)
- [ ] Loading de búsqueda implementado
- [ ] Home se refresca post-registro sin reload
- [ ] Auditoría de timezone escrita en el ADR
- [ ] `npm run type-check` y `npm run lint` OK
- [ ] Sin regresiones en `/home`, `/customer`, `/assistances` (v1)

**ADR:** ya existe ([20260819130435](../architecture/decisions/20260819130435_v2-attendance-modal.md)). Extenderlo con lo que salga de los puntos 1–5.

---

## Fase 4 — Navegación v2 real

**Estado:** ⬜ pendiente · **bloquea las fases 6–14**
**Figma:** instancia `Sidebar` presente en todas las pantallas. Desktop verificado visualmente en `2060:11534`; **mobile es un drawer de 260×844 sobre overlay** — ver `2174:24784` y `2201:58513`.

### Problema

El sidebar implementado **no coincide con el del Figma**. Comparación:

| Figma (`2060:11534`, verificado) | [AppSidebar.tsx](../../src/components/v2/AppSidebar.tsx) actual |
|---|---|
| Inicio | `v2.sidebar.menu.home` ✅ |
| Clientes | `v2.sidebar.menu.customers` ✅ |
| **Asistencias** (3er lugar) | `v2.sidebar.menu.attendance` (5to lugar) ⚠️ orden |
| **Membresías** (4to) | `v2.sidebar.menu.memberships` (3ro) ⚠️ orden |
| Ventas | `v2.sidebar.menu.sales` ✅ |
| **Gastos** | `v2.sidebar.menu.cashRegister` (Caja) ❌ **no existe en el Figma** |
| **Balance** | `v2.sidebar.menu.reports` (Reportes) ❌ **no existe en el Figma** |
| Configuraciones → Negocio · Membresías · Promociones · Usuarios | idéntico ✅ |

Además, sólo "Inicio" tiene `href`. El resto son items muertos.

### Alcance

1. **Alinear los items** al Figma: renombrar `cashRegister` → `expenses` (Gastos) y `reports` → `balance` (Balance), reordenar, actualizar keys en `es.json` / `en.json`.
2. **Rutas stub** bajo `/v2/`: `home` (existe), `customers`, `attendance`, `memberships`, `sales`, `expenses`, `balance`, `settings/{business,memberships,promotions,users}`. Cada una un Server Component con `AppShell` + `EmptyState` "En construcción". Así el sidebar navega de verdad y cada fase siguiente sólo llena su página.
3. **Constantes de ruta v2** en `src/consts/routes.ts` (o `routes-v2.ts` si se prefiere no mezclar) — nada de strings sueltos.
4. **Active state por ruta** — `isActive` hoy usa `pathname?.endsWith(item.href)`, que va a dar falsos positivos con rutas anidadas (`/v2/settings/memberships` vs `/v2/memberships`). Cambiar a match por segmento.
5. **Header: campana de notificaciones.** Está en el Figma con badge. Sin tabla de notificaciones (brecha B9), la opción barata es derivarlo de membresías por vencer + vencidas (ya hay `getUpcomingExpirationsCount` y `getExpiredMembershipsCount` en [src/home/api/server.ts](../../src/home/api/server.ts)). Si no se define el contenido, dejar el ícono sin badge antes que inventar datos.

**Riesgo timezone:** bajo (salvo el badge de notificaciones, que si sale de expiraciones usa `isExpiredInAppTz` / `daysUntilInAppTz`).

**Definición de hecho:**
- [ ] Sidebar idéntico al Figma en items, orden y labels
- [ ] Las 11 rutas stub responden y el active state es correcto en todas
- [ ] Colapsado (64px) y mobile (Sheet) siguen funcionando con los items nuevos
- [ ] Keys nuevas en `es.json` y `en.json`
- [ ] Sin strings de ruta hardcodeados

**ADR:** sí — cambio de taxonomía de navegación (Caja/Reportes → Gastos/Balance) e introducción de rutas stub.

---

## Fase 5 — Primitivas transversales v2

**Estado:** ⬜ pendiente · **bloquea las fases 6–14**
**Figma:** instancias repetidas a lo largo de las dos páginas. Las reglas de layout mobile están en [2.1](#21-convenciones-de-layout-mobile-derivadas-del-árbol-de-nodos) y son vinculantes para esta fase.

Esta fase no entrega ninguna pantalla de usuario. Entrega los 5 componentes que las 9 fases siguientes van a instanciar decenas de veces. Hacerlos mal o hacerlos tarde significa reescribir 9 secciones.

### 5.1 `DataTable` — la pieza más reusada

Aparece en 11 de los 17 flows. Requisitos derivados del árbol de nodos:

- Columnas configurables con render custom por celda (badges de estado, montos, fechas).
- **Dropdown de acciones por fila** — el flow 5 (`2118:22594`) muestra un `Dropdown` sobre la tabla; es el menú contextual de la fila.
- Estados: vacío, cargando (skeleton de filas), error, sin resultados de filtro. Desktop no los diseñó, pero **mobile sí tiene dos empty states de referencia**: `Gastos/Vacio` (`2286:119862`) y Ventas en $0 (`2265:70904`). Derivar el resto de ahí y anotarlos acá.
- Paginación o scroll infinito: **sin definir en el diseño** → [Decisiones abiertas](#decisiones-abiertas--riesgos) #4.
- **Responsive:** el mobile instancia `Data Table` a 358–390 de ancho y 481–544 de alto, así que el diseñador definió alguna degradación — **pero el árbol de nodos no dice cuál** (cards apiladas, scroll horizontal, menos columnas). **Es la incógnita más importante que queda del diseño: verificar visualmente `2201:57977` o `2277:88832` antes de escribir una línea del componente.**

Recomendación de implementación: **tabla propia sobre `<table>` semántico**, no TanStack Table. El uso real es render + orden + filtros server-side; una lib de 14kB para eso es sobre-ingeniería y complica el theming scoped.

### 5.2 `FormModal` (Figma: `Modal / Membership Form`)

Shell genérico de formulario en modal, usado por 8 flows para cosas distintas (alta de cliente, pago, plan de membresía, gasto, venta). **El nombre en Figma es engañoso: no es específico de membresías.**

- Soporta **multi-step** — los flows 2, 3 y 7 muestran 4–6 frames consecutivos con el mismo modal, que son los pasos del formulario.
- Desktop: panel lateral / dialog centrado (confirmar cuál contra `2117:8942`).
- Mobile: **full-screen 390×844** (`2175:28633`, `2183:39583`, `2286:117668`). **No es bottom sheet** — el árbol de nodos mobile lo desmiente.
- Debe manejar: header con título y cierre, body scrolleable, footer con acciones primaria/secundaria, indicador de paso, estado de submit.

### 5.3 `ConfirmDialog` (Figma: `Modal Dialog`)

Confirmación destructiva o de compromiso. Aparece en flow 3 (`2118:17604`, confirmar pago), flow 7 (`2118:27698`), flow 13 (`2139:17917`, exportar) y flow 15 (`2141:49736`, eliminar gasto). Wrapper sobre `alert-dialog` de shadcn con variante destructiva y estado de loading en el botón de confirmar.

### 5.4 `FilterBar` + `FilterDropdown`

El bloque `Search field` del Figma es en realidad una barra de filtros: `Input Search` + N `Dropdown` + botón de acción primaria. La cantidad de dropdowns varía por sección (Clientes: 2, Ventas/Gastos: 3, Balance: 2 sin search). Componer, no parametrizar con booleanos.

### 5.5 `DetailModal` shell

Base del `Customer Detail Modal` (flows 1, 5, 6, 7). Panel lateral en desktop / full-screen en mobile, con header de identidad, tabs y footer de acciones. `AssistanceModal.tsx` ya resuelve una variante concreta — **al construir el genérico, refactorizar `AssistanceModal` para consumirlo**, no dejar dos implementaciones.

### 5.6 Piezas menores

`EmptyState`, `PageHeader` (título + fecha + acción, el `Greetings Container` del Figma), skeletons por tipo de contenido.

**Riesgo timezone:** ninguno (son componentes de presentación). Pero `DataTable` va a renderizar fechas: la regla de formatear en server y pasar strings se aplica.

**Definición de hecho:**
- [ ] Los 5 componentes construidos con página de sandbox para verlos en aislamiento
- [ ] Estados vacío/cargando/error definidos y documentados acá para `DataTable`
- [ ] `data-v2='true'` propagado en todos los que usan portal
- [ ] Responsive verificado a 1440 / 768 / 375
- [ ] `AssistanceModal` refactorizado sobre `DetailModal`
- [ ] Accesibilidad: foco atrapado en modales, `aria-label` en acciones de ícono, navegación por teclado en la tabla

**ADR:** sí — decisiones de API de componentes, tabla propia vs librería, y los estados de tabla que el Figma no cubre.

---

## Fase 6 — Sección Clientes + Modal perfil de cliente

**Estado:** ⬜ pendiente
**Figma:** desktop `2167:22900` (3 pantallas) + `2167:22901` (5 pantallas) · **mobile `2222:43027` (7 pantallas: 2 de listado + 4 del Detail Modal + 1 con drawer)**.

### Pantallas

**Listado** (`2118:22308`): `FilterBar` (search + 2 dropdowns) + botón primario + `DataTable`. Los 2 dropdowns son probablemente estado de membresía y tipo de membresía — **verificar**.
**Menú de fila** (`2118:22594`): dropdown con acciones sobre el cliente.
**Perfil** (`2118:22907` y las 5 de la sección 6): `Customer Detail Modal`, aparentemente con tabs (5 frames del mismo modal = 5 vistas/tabs). Contenido probable: datos, membresía, historial de asistencias, historial de pagos. **Verificar cuáles son.**

También es el destino del card "Clientes activos del mes" del home (`80` / `4 clientes con membresías vencidas`) — el link tiene que llegar acá con el filtro correspondiente ya aplicado.

### Qué existe hoy

| Necesidad | Dónde está |
|---|---|
| Buscar / listar clientes | `searchAllCustomers` ([src/customer/api/server.ts](../../src/customer/api/server.ts)) |
| Cliente + membresía | `searchCustomersById`, `getCustomerBasic`, `getCustomerMembership` |
| Membresías activas / pendientes | `getActiveMemberships`, `getPendingPaymentCustomers` ([src/membership/api/server.ts](../../src/membership/api/server.ts)) |
| Grupos familiares del cliente | `getGroupsByCustomer` ([src/group/api/server.ts](../../src/group/api/server.ts)) |
| UI v1 de referencia | `src/customer/list.tsx`, `list-with-tabs.tsx`, `info-resume.tsx`, `membership.tsx` |

### A construir

- `src/app/[lang]/[tenant]/v2/customers/page.tsx`
- `src/customer/components/v2/CustomersTable.tsx`, `CustomerFilters.tsx`, `CustomerRowActions.tsx`
- `src/customer/components/v2/CustomerDetailModal.tsx` + un componente por tab
- Endpoint de listado paginado con filtros — `searchAllCustomers` hoy no pagina ni filtra por estado de membresía. **Extenderlo en `src/customer/api/server.ts`, no duplicar.**

**Brechas de DB:** ninguna bloqueante. Si el perfil muestra "activo/inactivo", `customers` no tiene ese campo — se deriva de `customer_membership.expiration_date`.

**Riesgo timezone:** medio. El filtro "activos del mes" y el badge de vencida usan `getMonthRangeInAppTz` y `isExpiredInAppTz`.

**Definición de hecho:**
- [ ] Listado con filtros y paginación funcionando con data real
- [ ] Menú de fila con todas las acciones del Figma
- [ ] Modal de perfil con todos sus tabs
- [ ] Link desde el card del home llega con el filtro aplicado
- [ ] Estados vacío/cargando/error
- [ ] Responsive: tabla → cards en mobile
- [ ] Auditoría de timezone

**ADR:** sí — paginación y filtrado server-side de clientes, y estructura del modal de perfil.

---

## Fase 7 — Alta de cliente

**Estado:** ⬜ pendiente
**Figma:** desktop `2166:22897` ("Desde el home", 7 pantallas) + `2167:22903` ("Desde Clientes", 4 pantallas) · **mobile `2222:43030` (3 pantallas, un solo flow)**.

> El mobile diseñó **una sola** sección de alta con 2 pasos, y desde Clientes se entra por el `New Client Button` icon-only del listado. Eso **valida el enfoque de un formulario con dos entradas** que ya proponía este plan. Si desktop tiene 5 pasos y mobile 2, resolver la diferencia antes de implementar.

Mismo formulario, **dos puntos de entrada**: el botón "Nuevo cliente" de Acciones rápidas del home (hoy hace `toast('próximamente')` en [QuickActionsSection.tsx](../../src/home/components/v2/QuickActionsSection.tsx)) y el botón primario del listado de Clientes. El flow desde el home tiene 5 frames de `Modal / Membership Form` = probablemente 4–5 pasos; el flow desde Clientes tiene 2. **Verificar si son el mismo formulario con distinta entrada o si difieren en pasos.**

### Qué existe hoy

- `src/customer/form.tsx` — form v1 multi-step.
- RPC `upsert_customer_with_membership` — crea cliente + membresía en una transacción.
- `src/customer/errors.ts`, `src/lib/format-person-id.ts`, `src/components/ui/input-person-id.tsx`.

### A construir

- `src/customer/components/v2/CustomerFormModal.tsx` sobre `FormModal` de Fase 5.
- Un componente por paso.
- Validación con los mismos errores que v1 (reusar `src/customer/errors.ts`).
- Toast de éxito (`2117:10405`, `2110:27462`) + refresh del listado / home.

**Brechas de DB:** B5 — `customers.person_id` no es UNIQUE. Decidir si el alta valida DNI duplicado en app, en DB, o ambos. Recomendación: constraint UNIQUE + manejo del error en el form, porque la validación sólo en app tiene race condition.

**Riesgo timezone:** alto si el paso de membresía crea un pago. `last_payment_date`, `expiration_date` y `renewal_date` van a la DB — **todas por `parseAppTzDateString`**.

**Definición de hecho:**
- [ ] Alta completa desde ambas entradas
- [ ] Validaciones idénticas a v1 (incluido DNI duplicado)
- [ ] Toast + refresh de la vista de origen
- [ ] Cancelar a mitad no deja registros huérfanos
- [ ] Auditoría de timezone del paso de membresía

**ADR:** sí — unificación del alta en un solo componente con dos entradas + decisión sobre DNI único.

---

## Fase 8 — Registrar pago / renovar membresía + comprobante

**Estado:** ⬜ pendiente
**Figma:** desktop `2166:22898` ("Desde el home", 10 pantallas — el flow más largo) + `2167:22902` ("Desde Cliente/Perfil", 7 pantallas) · **mobile `2222:43026` ("Renovar membresía desde acciones rápidas", 6 pantallas)**.

> ⚠️ **Dos huecos de diseño en mobile, a resolver al arrancar la fase:**
> 1. **El `Payment Receipt` no aparece en ningún flow mobile.** Desktop lo tiene en ambos flows (`2118:17883`, `2118:28076`); mobile termina en el `Modal Dialog` de confirmación (`2183:43825`). ¿No existe comprobante en mobile o falta diseñarlo? Siendo que la app en producción es mobile-first, asumir que no existe sería raro.
> 2. **Mobile tiene 6 pantallas contra 10 de desktop.** Confirmar si es el mismo flow con menos pasos o dos flows distintos.

### Estructura del flow

`FormModal` multi-step (6 frames en el flow 3, 4 en el flow 7) → `Modal Dialog` de confirmación (`2118:17604` / `2118:27698`) → `Payment Receipt` (`2118:17883` / `2118:28076`) → vuelta al origen.

El `Payment Receipt` es un componente nuevo y probablemente el único del rediseño pensado para imprimirse o compartirse. Hay precedente: `src/assistance/share-image-button.tsx` y `src/lib/hooks/use-share-image.ts` ya resuelven compartir como imagen.

### Qué existe hoy

| Necesidad | Dónde está |
|---|---|
| Crear pago + actualizar membresía | RPC `upsert_customer_membership_with_payment` (idempotente, migración `20260707113341`) |
| Precios por tipo | `getMembershipTypes` ([src/membership/api/server.ts](../../src/membership/api/server.ts)) |
| Recargo / media membresía | [src/accounting/billing-policy.ts](../../src/accounting/billing-policy.ts) — `getCyclePhaseForDate`, `isWithinGracePeriod` |
| Descuento por grupo familiar | `getApplicableDiscountForCustomer` ([src/group/api/server.ts](../../src/group/api/server.ts)) |
| CRUD de pagos | `createMembershipPayment`, `updateMembershipPayment` ([src/accounting/api/server.ts](../../src/accounting/api/server.ts)) |
| UI v1 de referencia | `src/customer/membership-form.tsx` |

### Reglas de negocio que el formulario debe respetar

Política de cobro de Actitud (ciclo día-de-mes fijo, hardcodeada en `ACTITUD_BILLING_POLICY`):
- Días **1–15**: monto normal (`types_memberships.amount`).
- Día **16 en adelante**: recargo (`amount_surcharge`) o media membresía (`middle_amount`) según corresponda.

El formulario tiene que **calcular y mostrar el monto sugerido** usando `getCyclePhaseForDate`, aplicar el descuento de grupo familiar si corresponde, y permitir override manual (`discount_rules.applies_to = 'manual'` + `discount_note`).

### Brechas de DB

- **B3** — `receipt_number` en `membership_payments`. Sin esto el comprobante no tiene identificador estable. Opción barata: secuencia por año.
- **Defecto C** — verificar y arreglar el `DEFAULT 'efectivo'` que viola el CHECK. Esta fase es la que lo va a tocar de verdad.

**Riesgo timezone:** **el más alto de todo el plan.** `payment_date` determina el mes contable y, vía `getCyclePhaseForDate`, si se cobra recargo. Un desfase de 3 horas el día 15 a las 22hs cobra recargo de más. Este es exactamente el bug que ya pasó dos veces (ADR [20260709153000](../architecture/decisions/20260709153000_representacion-canonica-de-fechas-ar.md)). **Auditar cada call site nuevo, sin excepción.**

**Definición de hecho:**
- [ ] Pago completo desde ambas entradas (Home y Perfil de cliente)
- [ ] Monto sugerido correcto en días 1–15 y 16+
- [ ] Descuento de grupo familiar aplicado
- [ ] Override manual con nota obligatoria
- [ ] `Payment Receipt` renderiza y se puede compartir/imprimir
- [ ] Idempotencia verificada: doble submit no crea dos pagos
- [ ] `receipt_number` en DB y en el comprobante
- [ ] Defecto C verificado en dev
- [ ] **Auditoría de timezone documentada call-site por call-site en el ADR**

**ADR:** sí, obligatorio. Es el flow con más reglas de negocio y el de mayor riesgo.

---

## Fase 9 — Sección Asistencias

**Estado:** ⬜ pendiente · 🔵 diseño incompleto
**Figma:** desktop `2167:22904` (2 pantallas) · **mobile `2228:49268` (2 pantallas)**.

> ⚠️ **Divergencia de navegación.** Desktop tiene `Tabs` + `DateNavigation` opcional; **mobile no tiene Tabs** y muestra `DateNavigation` siempre (`2228:48632`, `2228:48923`). Decidir si los tabs desaparecen también en desktop (más simple, un solo modelo mental) o si la divergencia es intencional. Definirlo **antes** de construir, no después.

`Tabs` + `Summary Section Container` con `Customer List`. La segunda pantalla (`2118:28933`) reemplaza el título por un `DateNavigation`, así que los tabs son probablemente **"Hoy" / "Historial"**, y el historial trae navegación por fecha.

La anotación `2118:29353` ("Ver estados del historial") confirma que **los estados de la lista no están diseñados**.

Es también el destino del card "Asistencias de hoy" del home.

### Qué existe hoy

`getTotalAssistancesToday`, `getAssistancesByDate`, `getTodayAssistances`, `getAssistancesByWeek`, `getTopCustomersThisMonthRPC` ([src/assistance/api/server.ts](../../src/assistance/api/server.ts)). UI v1: `assistances-list.tsx`, `day-navigator.tsx`, `top-monthly-assintant.tsx`, `counter.tsx`.

Prácticamente toda la lógica existe. Esta fase es mayormente portar UI.

### A construir

- `src/app/[lang]/[tenant]/v2/attendance/page.tsx`
- `src/assistance/components/v2/AttendanceTabs.tsx`, `CustomerList.tsx`, `DateNavigation.tsx`

**Brechas de DB:** ninguna (salvo B4, que se resuelve en Fase 3).

**Riesgo timezone:** alto. Todo el módulo pivotea sobre "qué día es hoy en AR". `getAssistancesByDate` recibe un `Date` — verificar que el caller lo construya con `parseAppTzDateString` y no con `new Date(string)`.

**Definición de hecho:**
- [ ] Tabs Hoy/Historial con navegación por fecha
- [ ] Lista con estados vacío/cargando/error (definidos por nosotros, documentados acá)
- [ ] Link desde el card del home funciona
- [ ] Auditoría de timezone

**ADR:** probablemente no si es sólo port de UI. Sí si aparecen endpoints nuevos o cambia el shape de respuesta.

---

## Fase 10 — Sección Membresías (planes y precios)

**Estado:** ⬜ pendiente
**Figma:** desktop `2167:22905` (4 pantallas) · **mobile `2265:69683` (3 pantallas)**.

> Mobile resuelve el "crear plan" con un **CTA sticky al fondo** (`Container` 389×85 con botón de 341×36 en `2246:49888`), no con el botón del `PageHeader` como desktop.

`PageHeader` (greeting + fecha + botón) + `DataTable` de planes + `FormModal` para crear/editar + Toast. Es un CRUD sobre `types_memberships`, no sobre las membresías de clientes.

### Qué existe hoy

`getMembershipTypes`, `updateMembershipPrices` ([src/membership/api/server.ts](../../src/membership/api/server.ts)). UI v1: `src/membership/components/amounts.tsx`, `amount-form.tsx`, `active-types.tsx`. Ruta v1: `/stats/membership/edit/[type]`.

Los 5 tipos están hardcodeados en [src/membership/consts.ts](../../src/membership/consts.ts) (`MembershipTypeArray`) con traducciones por key. **Si el Figma permite crear planes nuevos desde la UI, esa constante deja de ser la fuente de verdad** — hay conflicto entre "tipos hardcodeados con i18n" y "CRUD dinámico". → [Decisiones abiertas](#decisiones-abiertas--riesgos) #7.

**Brechas de DB:** B6 — `types_memberships` no tiene `active` ni `description`. Sin `active` no se puede discontinuar un plan sin romper el histórico de `membership_payments` que lo referencia por FK.

**Riesgo timezone:** bajo. `last_update` es informativo.

**Definición de hecho:**
- [ ] Listado de planes con precios (normal / recargo / media)
- [ ] Crear y editar plan
- [ ] Discontinuar plan sin romper histórico
- [ ] Resuelto el conflicto tipos-hardcodeados vs CRUD dinámico
- [ ] Toast + refresh

**ADR:** sí — la decisión sobre tipos dinámicos vs hardcodeados tiene impacto en todo el dominio de membresías.

---

## Fase 11 — Sección Gastos

**Estado:** ⬜ pendiente
**Figma:** desktop `2167:22910` ("crear/editar", 6 pantallas) + `2167:22911` ("eliminar", 3 pantallas) · **mobile `2286:119425` (5 pantallas, crear/editar/eliminar juntos)**.

> Mobile nombra sus frames de forma explícita y útil: `Gastos/Vacio` (`2286:119862`), `Gastos/Nuevo Gasto`, `Gastos` (con data), `Gastos/Editar`, `Gastos/Eliminar`. **`Gastos/Vacio` es la única referencia canónica de empty state en todo el rediseño** — usarla como base para el `EmptyState` de la Fase 5.
>
> ⚠️ **Bug de copy en el diseño mobile:** los KPIs de Gastos dicen **"Total cobrado"** (`2286:119875`, `2329:29066`), copy heredado del componente de Ventas. Desktop dice "Total de gastos" (`2139:18310`), que es lo correcto. Implementar "Total de gastos" y avisar al diseñador.

Layout: `PageHeader` + fila de 3 KPIs (**Total de gastos / Efectivo / Transferencias**) + `FilterBar` (search + 3 dropdowns) + `DataTable`. Crear/editar por `FormModal`, eliminar por `ConfirmDialog` + Toast.

### Qué existe hoy

CRUD completo: `getExpenses`, `getExpenseById`, `createExpense`, `updateExpense`, `deleteExpense` ([src/accounting/api/server.ts](../../src/accounting/api/server.ts)) + wrappers HTTP en `src/expenses/api/index.ts` y rutas `/api/accounting/expenses`. UI v1: `src/expenses/components/{list,form,expense-row}.tsx`. 8 categorías en [src/expenses/consts.ts](../../src/expenses/consts.ts) con mapa de migración desde nombres viejos en español.

`withCanonicalExpenseDate` en `src/accounting/api/server.ts` ya canonicaliza `expense_date` — ADR [20260729150049](../architecture/decisions/20260729150049_expenses-timezone-canonicalization.md). **Reusar, no reimplementar.**

### Brechas de DB — bloqueante suave

**B1: `expenses` no tiene `payment_method`.** Los KPIs "Efectivo / Transferencias" del Figma no se pueden calcular. Es una migración chica pero hay que decidir qué pasa con los gastos históricos:

```sql
ALTER TABLE public.expenses
  ADD COLUMN payment_method varchar
    CHECK (payment_method IN ('PAYMENT_CASH','PAYMENT_TRANSFER'));
```

Dejarla nullable evita backfill inventado; los KPIs muestran los históricos como "sin especificar". Alternativa: backfill a `PAYMENT_CASH` asumiendo que así se pagaba. **Decisión del negocio, no técnica.** → [Decisiones abiertas](#decisiones-abiertas--riesgos) #8.

**B2: borrado.** Hoy `deleteExpense` hace hard delete. El flow 15 tiene confirmación explícita, lo cual es consistente con hard delete. Si se quiere papelera, agregar `deleted_at` y filtrar en todos los reads.

**Riesgo timezone:** medio-alto. Los 3 KPIs son del mes en curso → `getMonthRangeInAppTz`. Los filtros de fecha → `parseAppTzDateString`. Ya hubo un incidente acá (ver el ADR linkeado arriba).

**Definición de hecho:**
- [ ] Migración `payment_method` aplicada en dev y decidido el tratamiento del histórico
- [ ] Los 3 KPIs cuadran con la suma de la tabla
- [ ] Crear, editar y eliminar con confirmación y toast
- [ ] Filtros (search + 3 dropdowns) funcionando
- [ ] Auditoría de timezone
- [ ] `/expenses` v1 sigue funcionando con la columna nueva

**ADR:** sí — migración de `payment_method` + tratamiento del histórico.

---

## Fase 12 — Sección Ventas

**Estado:** ⚠️ **bloqueada — no existe modelo de datos**
**Figma:** desktop `2167:22906` (a clientes, 5), `2167:22907` (a no clientes, 3), `2167:22908` (exportar, 2) · **mobile `2286:118422` (a clientes, 5), `2286:118789` (a no clientes, 2), `2286:118889` (exportar, 2)**.

> Mobile tiene **el estado vacío diseñado** (`2265:70904`, con los tres KPIs en $0) además del estado con data (`2277:96065`). Segunda referencia canónica de empty state junto con `Gastos/Vacio`.

Layout análogo a Gastos: `PageHeader` + 3 KPIs (Total cobrado / Efectivo / Transferencias) + `FilterBar` (search + 3 dropdowns) + `DataTable` + `FormModal` de venta. La sección 13 agrega export vía `ConfirmDialog`.

Dos modos de venta: **a cliente** (se elige de la base) y **a no cliente** (walk-in). El modelo tiene que soportar ambos.

**Esta fase no se puede empezar sin cerrar A1** ([Brechas de base de datos](#a1-ventas--productos--no-existe-modelo-fase-12)): `products`, `sales`, `sale_items`. Antes de escribir una línea de UI:

1. Definir el alcance con el negocio (¿stock? ¿anulación? ¿múltiples items por venta o uno solo?).
2. Escribir y revisar la migración.
3. Aplicar en dev, cargar datos de prueba.
4. Recién ahí construir el dominio `src/sales/` completo (`api/server.ts`, `api/client.ts`, `types.ts`, `consts.ts`, `components/v2/`).

**Export (sección 13):** decidir formato (CSV vs XLSX) y si se genera en cliente o server. CSV en cliente es lo más barato y no agrega dependencias.

**Riesgo timezone:** alto — `sale_date` define el día/mes contable, igual que `payment_date`.

**Definición de hecho:**
- [ ] Migración de `products` / `sales` / `sale_items` aplicada en dev
- [ ] Dominio `src/sales/` completo
- [ ] Venta a cliente y a no cliente
- [ ] 3 KPIs cuadran con la tabla
- [ ] Export funcionando
- [ ] Auditoría de timezone

**ADR:** sí, obligatorio y **antes de implementar** — es un modelo de datos nuevo.

---

## Fase 13 — Balance

**Estado:** ⬜ pendiente · depende de 11 y 12
**Figma:** desktop `2167:22912` (1 pantalla, `2141:50936`) · **mobile `2345:37294` (1 pantalla, `2329:30598` — 390×1071 con scroll)**.

> Mobile confirma la estructura: fecha + 2 `Dropdown` de filtro + **3 `Metric Card` apiladas** (106/106/92 — la tercera es más baja, probablemente el resultado neto) + 2 `Card` de detalle de alturas distintas (152 y 279).

`PageHeader` + 2 `Dropdown` de filtro (probablemente período y algo más) + **3 `Metric Card`** + 2 `Card` de detalle. Es el dashboard de ingresos vs egresos.

### Qué existe hoy

Bastante: `getMonthlyStats` ([src/accounting/api/server.ts](../../src/accounting/api/server.ts)) ya devuelve `total_income`, `total_expenses`, `net_result`, `payments_count`, `expenses_count`. `src/accounting/api/incomes.ts` tiene desglose por método de pago y por tipo. Hooks: `useIncomesSummary`, `useMonthlyStats`, `useIncomesByType`, `useIncomesPending`. Dashboard v1 en `/incomes` (ADR [20260728141829](../architecture/decisions/20260728141829_incomes-dashboard-redesign.md)).

**Lo que falta:** `getMonthlyStats` no incluye ventas (no existen todavía). Una vez que exista `sales`, hay que sumarla al ingreso total.

**Riesgo timezone:** alto. Todo el módulo es agregación por mes contable → `getMonthRangeInAppTz` en cada consulta. Existe el ADR [20260729101233](../architecture/decisions/20260729101233_unificar-rango-mensual-en-timezone-ar.md) que unificó esto: **reusar ese helper, no escribir rangos a mano.**

**Definición de hecho:**
- [ ] Las 3 métricas + 2 cards con data real
- [ ] Ventas incluidas en el ingreso
- [ ] Filtros de período funcionando
- [ ] Los números cuadran con Gastos y Ventas por separado
- [ ] Auditoría de timezone

**ADR:** probablemente sí — cambia el cálculo de ingreso total al incorporar ventas.

---

## Fase 14 — Configuración

**Estado:** ⬜ pendiente
**Figma:** desktop `2167:22913` (3 pantallas) · **mobile `2345:37297` (3 pantallas, con nombres explícitos)**.

> ⚠️ **El mobile resuelve una de las dudas y abre otra.**
>
> **Resuelve:** los frames mobile están nombrados — `Configuración/Negocio` (`2333:33003`), `Configuración/Membresía` (`2333:37880`), `Configuración/Promociones` (`2333:38036`). Por posición y estructura, los dos `Data Table` sin nombre de desktop (`2151:58342`, `2151:68169`) son **Membresías y Promociones**. Ya no hace falta abrirlos para saber qué son.
>
> **Abre:** en mobile la navegación es con **`Tabs` dentro de la pantalla**, no con sub-items del sidebar. Y **son 3 tabs, no 4: falta Usuarios.** Hay que decidir si Usuarios se diseña, si se deja sólo en desktop, o si se difiere.
>
> Nota adicional: `Configuración/Promociones` tiene **CTA sticky al fondo** (`2345:37182`), igual que Membresías.

El sidebar tiene 4 sub-items pero sólo hay 3 pantallas diseñadas, en ambos viewports:

| Sub-item | Desktop | Mobile | Estado |
|---|---|---|---|
| Negocio | `2141:51590` | `2333:33003` | ✅ diseñada — form "General Information" (4 `Form Input` + `ImageUpload` de logo) |
| Membresías | `2151:58342` | `2333:37880` | ✅ diseñada — `Data Table`. **Se solapa con la Fase 10**, resolver abajo |
| Promociones | `2151:68169` | `2333:38036` | ✅ diseñada — `Data Table` + CTA sticky |
| Usuarios | ❌ | ❌ | 🔵 **sin diseñar en ningún viewport** |

**Solapamiento Membresías ↔ Fase 10.** Tanto la sección Membresías del sidebar (Fase 10) como Configuración → Membresías muestran un `Data Table` de planes. **Probablemente son la misma pantalla accesible desde dos lugares.** Confirmarlo al abrir los nodos: si lo son, se implementa una sola vez en la Fase 10 y Configuración sólo la linkea. Si difieren, documentar en qué.

### Brechas de DB

- **A2** — `business_settings` no existe. Bloqueante para "Negocio".
- **Storage** — el logo necesita bucket de Supabase Storage + política de acceso público de lectura.
- **B7** — `discount_rules` no tiene vigencia (`valid_from` / `valid_to`) para Promociones.
- **B8** — `profile` no tiene `email`; Usuarios lo necesita. Y `user_roles` existe con 4 roles (`admin`, `manager`, `employee`, `viewer`) pero no hay flow de invitación.

**Riesgo timezone:** bajo, salvo la vigencia de promociones (`valid_from`/`valid_to` → `parseAppTzDateString`).

**Definición de hecho:**
- [ ] Resuelto el solapamiento Membresías ↔ Fase 10 (una pantalla o dos)
- [ ] Decidido el patrón de navegación: sub-items de sidebar (desktop) vs `Tabs` in-page (mobile) — o unificar
- [ ] `business_settings` + bucket de Storage
- [ ] Form de Negocio con upload de logo funcionando
- [ ] Promociones sobre `discount_rules` + vigencia (B7)
- [ ] Usuarios: diseñar la pantalla, o documentar explícitamente por qué se difiere

**ADR:** sí — `business_settings`, Storage, y el modelo de promociones.

---

## Fase 15 — Promoción de v2 a default

**Estado:** ⬜ pendiente · fuera del alcance actual

Se planifica cuando 3–14 estén cerradas. A tener en cuenta desde ya:

- **Paridad funcional.** La v1 tiene cosas que el Figma no cubre: grupos familiares (`src/group/`), share de imagen de asistencias, stats de membresías. Auditar qué se porta, qué se descarta y qué se rediseña.
- **Manifest PWA.** `theme_color` y `background_color` están hardcodeados a la paleta v1.
- **Wireframes mobile.** El Figma es 100% desktop 1280×832. **No existe ni un solo wireframe mobile**, y la app hoy es mobile-first en producción. Es el riesgo más grande del rediseño → [Decisiones abiertas](#decisiones-abiertas--riesgos) #1.
- **Retiro del flag.** Qué pasa con `user_feature_flags` y las rutas `/v2/*` — ¿redirect permanente o rename?

---

## Decisiones abiertas / riesgos

Ordenadas por impacto. Las que bloquean una fase están marcadas.

1. **~~No hay diseño mobile~~ → RESUELTO (2026-09-15).** Los 12 flows mobile están indexados en [Figma — índice de nodos mobile](#2-figma--índice-de-nodos-mobile). Lo que **queda abierto** del tema mobile son tres huecos concretos, cada uno asignado a su fase:
   - **Configuración → Usuarios no tiene pantalla mobile** (el sidebar desktop tiene 4 sub-items, el mobile diseñó 3 tabs). → Fase 14.
   - **`Payment Receipt` no aparece en ningún flow mobile.** ¿No existe en mobile o falta diseñarlo? → Fase 8.
   - **Divergencia de navegación en Asistencias** (desktop con `Tabs`, mobile sin ellos) y en **Configuración** (sub-items de sidebar vs tabs in-page). Decidir si son intencionales. → Fases 9 y 14.

2. **⚠️ Paleta: el Figma es rosa/magenta, la implementación es neutral.** La pantalla verificada (`2060:11534`) usa un accent rosa fuerte (`#E91E63`-ish) en botón primario, ítem activo del sidebar y barras del chart semanal. La Fase 1 implementó tokens neutrales con accents green/yellow. **¿El rosa es la marca de Actitud, o es placeholder del wireframe?** Confirmar antes de la Fase 5, porque las primitivas van a fijar el look de todo lo demás.

3. **Estados de tabla y lista — parcialmente resueltos por el mobile.** En desktop hay tres anotaciones del diseñador pidiendo definirlos (`2118:22319`, `2118:22606`, `2118:29353`), pero **el mobile sí diseñó dos empty states**: `Gastos/Vacio` (`2286:119862`) y Ventas en $0 (`2265:70904`). Usar esos dos como referencia canónica y derivar el resto (cargando, error, sin resultados de filtro) en la Fase 5, documentándolos acá. Ya no hace falta pedir nada.

4. **Paginación de tablas sin definir.** Ningún wireframe muestra paginador. Con el volumen actual (~cientos de clientes) scroll + filtros alcanza, pero conviene decidirlo en Fase 5 y no después de 11 tablas construidas.

5. **⚠️ Alcance de Ventas (bloquea Fase 12).** ¿Control de stock? ¿Se puede anular una venta? ¿Múltiples productos por venta o uno solo? ¿Quién carga el catálogo de productos? Sin esto no se puede diseñar el schema.

6. **`business_settings`: fila única o `tenant_id` desde ya (bloquea Fase 14).** Agregar `tenant_id` ahora cuesta poco; migrarlo después con datos cuesta bastante más.

7. **Tipos de membresía: hardcodeados vs CRUD (bloquea Fase 10).** Hoy los 5 tipos están en `MembershipTypeArray` con traducciones por key i18n. Si la sección Membresías permite crear planes nuevos, esa constante deja de ser la fuente de verdad y los nombres tienen que salir de la DB (perdiendo i18n por key). Decidir antes de construir.

8. **Histórico de gastos sin `payment_method` (bloquea Fase 11).** ¿Los gastos existentes se backfillean a "efectivo" o quedan como "sin especificar"? Decisión del negocio.

9. **Notificaciones del header.** Hay campana con badge en el diseño, no hay modelo de datos. Derivarla de membresías por vencer es barato y útil. Alternativa honesta: ícono sin badge hasta que se defina.

10. **Cuota del MCP de Figma.** El seat View limita fuerte las llamadas. Opciones: subir el seat, exportar los frames a PNG manualmente a `docs/v2/figma/`, o racionar la cuota por fase (lo que asume este plan). Si el proyecto va a durar meses, exportar los PNGs una vez es probablemente lo más barato.

11. **Multi-tenant runtime.** Cuándo migrar la DB a `tenant_id` + RLS. No bloquea la v2 de Actitud pero debería resolverse antes de onboardear un 2do tenant. Cruza con las decisiones #6 y #5 (tablas nuevas: ¿nacen con `tenant_id`?).

12. **Toggle de v2 en el perfil de usuario.** Hoy el flag se habilita por SQL directo. ¿Se hace UI de admin, o se deja así hasta el corte?

---

## Checklist de verificación estándar

Aplica a **toda** fase antes de pedir review. Está pensado para que el otro dev valide en el preview de Vercel sin correr SQL ni migraciones (dev y preview comparten DB).

### Local, antes de pushear
1. `npm run type-check` — sin errores nuevos.
2. `npm run lint` — sin errores nuevos.
3. `npm run dev` — arranca sin warnings nuevos en consola.
4. Responsive: 1440px → 768px → 375px sin overflow horizontal.
5. Auditoría de timezone: cada fecha nueva que llega a un RPC o a la DB pasa por un helper de `src/lib/timezone.ts`.

### En el preview
1. **User sin `v2_access`:** `/home` (v1) funciona; `/v2/*` redirige a `/home`.
2. **User con `v2_access`:** el flow nuevo funciona end-to-end con data real; `/home` (v1) sigue intacta.
3. **Sin regresiones en v1:** `/home`, `/customer`, `/expenses`, `/stats`, `/incomes`, `/assistances`.
4. **Golden path + al menos un edge case + un caso de error** del flow de la fase.
5. Tokens: colores, tipografía y spacing coinciden con el Figma (inspección visual + DevTools).

### Antes de mergear
- ADR creado y commiteado junto al feature (no en commit separado).
- Este plan actualizado: tabla de estado, sección de la fase, y entrada en Cambios registrados.

---

## Cambios registrados

> Log de decisiones o cambios de alcance. Formato: `YYYY-MM-DD — descripción — quién`.

- 2026-08-17 — Plan inicial creado y aprobado en sesión — Ema + Claude.
- 2026-08-17 — Fase 0 implementada (PR #43). Skipeada la sub-tarea "toggle en sidebar v1" (el `FooterNavigation` v1 no da lugar natural; se difiere al menú de user de v2). Habilitación del flag por SQL directo, sin UI de admin — Claude.
- 2026-08-17 — Fase 1 implementada en `feat/v2-design-system` (PR #44). Convenciones de theming scoped, AppShell y cards individuales — ver [Fases 0–2](#fases-02-histórico) — Ema + Claude.
- 2026-08-17 — Fase 1.5 en `feat/v2-sidebar-collapsible` (PR #45). Sin ADR nuevo. Modo colapsado 64px, popover a la derecha, `data-v2` en portales, gate CSS en vez de `useIsMobile()` — Ema + Claude.
- 2026-08-18 — Fase 1.6: fixes de i18n, composition y hidratación (PR #46). i18n obligatorio desde día 1, fechas formateadas en server, sub-componentes explícitos — Ema + Claude.
- 2026-08-19 — Fase 2 completa. PRs #47 y #48 mergeados en develop. Home v2 funcional con data real — Ema + Claude.
- 2026-08-19 — Fase 3: modal de asistencia, `SuccessTick` sin dependencias, búsqueda insensible a acentos. **PR #49 mergeado en `develop`** — Ema + Claude.
- 2026-09-15 — Corregido el estado de la Fase 3: figuraba 🟡 "en curso" por una comparación contra un `develop` local desactualizado. Los 3 commits están en `origin/develop` desde el 2026-08-19; la rama `feat/v2-attendance-modal` quedó integrada y puede borrarse. Los pendientes de la fase (verificación contra Figma, duplicado de asistencia, loading de búsqueda) siguen abiertos y se arrastran a la fase que los toque — Ema + Claude.
- 2026-09-10 — **Plan extendido a los 17 flows del Figma.** Se agregó: índice completo de nodos por flow, inventario de componentes compartidos, análisis de brechas de DB contra `shemema.txt`, y fases 3–15 con alcance, datos, riesgo de timezone y definición de hecho por fase. Hallazgos que cambian el alcance previsto:
  - **Ventas no tiene modelo de datos** (`products`/`sales`/`sale_items` no existen) → Fase 12 bloqueada hasta diseñar el schema.
  - **Configuración > Negocio no tiene tabla** ni bucket de Storage → Fase 14 bloqueada parcialmente.
  - **`expenses` no tiene `payment_method`**, así que los KPIs Efectivo/Transferencias del Figma no se pueden calcular → migración en Fase 11.
  - **El sidebar implementado no matchea el Figma**: "Caja" y "Reportes" no existen en el diseño; son "Gastos" y "Balance". Además el orden difiere → Fase 4.
  - **Defecto latente en el schema**: `membership_payments.payment_method` tiene `DEFAULT 'efectivo'` que viola su propio CHECK; cualquier insert que omita la columna falla.
  - **No hay ni un wireframe mobile** en las 73 pantallas, siendo que la app en producción es mobile-first.
  - **La paleta del Figma es rosa/magenta**, no los tokens neutral+green/yellow que implementó la Fase 1.
  - **Límite de cuota del MCP de Figma** (seat View): sólo se pudo inspeccionar visualmente 1 de 73 pantallas. El resto del plan se derivó del árbol de nodos. Cada fase debe verificar sus nodos antes de implementar.
  — Ema + Claude.
- 2026-09-15 — **Indexados los 12 flows mobile.** Ema pasó el nodo `2167:22916`: resultó ser una **segunda página del mismo archivo** ("Wireframes mobile"), no un archivo aparte — el listado de páginas de la API no la devolvía, pero responde bien por node ID directo. Se agregó el índice completo, las convenciones de layout mobile (2.1) y la tabla de divergencias mobile↔desktop (2.2). Cada fase ahora tiene sus dos referencias. Hallazgos que cambian decisiones ya tomadas:
  - **Los modales mobile son full-screen 390×844, no bottom sheets.** Corregido el supuesto de la Fase 5.
  - **El sidebar mobile es un drawer de 260px** (no 255 como desktop) sobre overlay.
  - **Dos empty states sí están diseñados** (`Gastos/Vacio`, Ventas en $0) → la decisión abierta #3 deja de requerir input del diseñador.
  - **Configuración se navega con `Tabs` in-page en mobile** y con sub-items de sidebar en desktop; y **Usuarios no está diseñado en ningún viewport**.
  - **Los nombres de los frames mobile resuelven las 2 tablas sin identificar de Configuración desktop**: son Membresías y Promociones. Aparece un solapamiento nuevo entre Configuración→Membresías y la Fase 10.
  - **Asistencias no tiene `Tabs` en mobile** pero sí en desktop — divergencia a resolver en la Fase 9.
  - **El `Payment Receipt` no existe en ningún flow mobile**, siendo que la app es mobile-first. Hueco real para la Fase 8.
  - **KPIs tienen dos tratamientos:** cards apiladas en Home/Balance, fila de 3 `Paragraph` compactos en Ventas/Gastos.
  - **Bug de copy en el diseño:** los KPIs de Gastos mobile dicen "Total cobrado" en vez de "Total de gastos".
  - Queda **una sola incógnita de diseño realmente bloqueante**: cómo degrada el `Data Table` en 358px. Verificar antes de la Fase 5.
  — Ema + Claude.
- 2026-09-10 — Agregado el **protocolo de trabajo con el Figma** (abrir el nodo-sección del flow → volcar hallazgos acá → marcar verificado → recién ahí implementar) y la tabla vacía de **flows mobile**, pendiente de que Ema pase el `fileKey` y los nodos-sección del archivo mobile. Reformulada la decisión abierta #1: los flows mobile existen, el problema es que no están indexados, no que no estén diseñados — Ema + Claude.
