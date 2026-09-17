# Home v2 — Fase 2 PR 1: skeleton + búsqueda + métricas superiores

**Fecha:** 2026-08-18
**Autor:** ema_villanueva@hotmail.com
**Rama:** feat/v2-home-skeleton-and-metrics

## Descripción

Arranca la Fase 2 del rediseño v2. Reemplaza el placeholder de `/v2/home` por la primera mitad del diseño real del home: la card de búsqueda con CTA de registrar asistencia, la fila de dos MetricCards con data del negocio, y la sección de acciones rápidas.

Data en Figma frames [142:3212](https://www.figma.com/design/pWXxc6sefUxjKVCS2IAR3x/?node-id=142-3212) (sin actividad) y [87:1591](https://www.figma.com/design/pWXxc6sefUxjKVCS2IAR3x/?node-id=87-1591) (con actividad). Las secciones `DailySummary` y `WeeklyAttendance` del diseño se difieren al PR 2 de Fase 2 para mantener el review de este PR razonable.

Después de este PR el home v2 pasa de placeholder a "navegable con data real": las métricas reflejan asistencias, membresías activas, vencimientos próximos y vencidas del tenant. El botón `Registrar asistencia` y las 2 acciones rápidas quedan como placeholder con toast "próximamente" — el modal / flow real se abordan en PRs siguientes.

## Decisiones

### Decisiones de negocio

- **Split de Fase 2 en 2 PRs.** PR 1 = skeleton + métricas superiores; PR 2 = DailySummary + WeeklyAttendance. Justificación: PR 1 desbloquea el home visualmente completo en las secciones más pedidas (búsqueda + métricas + acciones) y permite validar tokens + composition en preview con data real, sin arrastrar la review con las secciones que requieren queries de agregación adicionales. Descartado un PR único: hubiera duplicado el diff (~15 files nuevos) y demorado la validación.
- **"Clientes activos del mes" = membresías con `expiration_date >= inicio del día AR de hoy`.** Se descartaron dos interpretaciones alternativas:
  - "Clientes con ≥1 asistencia en el mes": requiere DISTINCT sobre `assistance` filtrado por mes; más pesado y semánticamente mide *actividad* real, no *pool activo*.
  - "Clientes que pagaron en el mes": mide flujo financiero, no salud del pool.
  La interpretación adoptada coincide con `getActiveMemberships()` del dominio membership y con la métrica que v1 ya usa (`customer.actives` en i18n).
- **Ventana de "vencimientos próximos" = 7 días.** Suficiente anticipación para que el gimnasio actúe sin generar ruido. Constante semántica `UPCOMING_EXPIRATION_WINDOW_DAYS` en `src/home/consts.ts` para poder ajustar en un solo lugar si el negocio cambia el criterio.
- **Prioridad del subtítulo del MetricCard "Activos":** `expiradas (rojo) > próximas (amarillo) > "Todos al día" (muted)`. Vencidas son más urgentes que próximas — el gimnasio pierde plata por cada día que un vencido asiste sin renovar.
- **CTA "Registrar asistencia" y acciones rápidas → toast "próximamente".** No hay modal real todavía; en vez de dejar los botones inertes o disabled (feedback pobre) o hardcodear un TODO, se comunica al usuario que la funcionalidad llega en la siguiente entrega. El texto del toast va por i18n (`v2.home.attendanceSearch.toastComingSoon*`, `v2.home.quickActions.toastComingSoon*`).

### Decisiones técnicas

- **Dominio nuevo `src/home/`.** Sigue el patrón de otros dominios (`src/customer/`, `src/membership/`). Estructura mínima: `api/server.ts`, `consts.ts`, `types.ts`, `components/v2/*.tsx`. Sin `api/client.ts` ni `hooks/` — no hay consumers todavía, se agregan cuando aparezcan (regla de proyecto de no inflar).
- **`getHomeMetrics()` como agregador único.** Una sola función server que devuelve `HomeMetrics` con los 5 counters (`todayCount`, `deltaVsLastWeek`, `activeCount`, `upcomingExpirationsCount`, `expiredCount`). Internamente hace `Promise.all` de las 5 queries independientes → aplica `async-parallel` de Vercel best practices. La página consume una sola await y compone sub-componentes. Alternativa descartada: componer llamadas individuales en `page.tsx` — habría duplicado boilerplate y regado la lógica de tz por varios call sites.
- **Delta vs. mismo día 7 días atrás.** Fórmula: `todayCount - assistancesForDay(today - 7d)`. La comparación es "mismo día de la semana" — más significativo que "vs. día calendario anterior" (que compararía hoy vs ayer, ignorando el ciclo semanal del gimnasio: los martes y miércoles suelen tener asistencia distinta). Sin data previa (ambos counts = 0) se devuelve `null` y la UI cae al fallback "Sin asistencias registradas".
- **Todas las fechas via helpers `getDayRangeInAppTz` / `getTodayRangeInAppTz`.** Regla crítica del proyecto documentada en CLAUDE.md y en el ADR [20260709153000](20260709153000_representacion-canonica-de-fechas-ar.md). El shift de 7 días atrás se hace con `setUTCDate(-7)` sobre un `Date` intermedio y el rango se resuelve con el helper — nunca se toca `assistance_date` en la DB con strings crudos.
- **`MetricsRow` es `async` server component y recibe `lang` + `tenant`.** Llama internamente a `i18n.fetch(lang, tenant)`. Como `fetchTranslations` está wrappeado en `React.cache`, la llamada duplica la del layout sin costo. Alternativa descartada: pasar `t` como prop desde `page.tsx` — funciona (server→server no tiene restricciones de serialización) pero hace `MetricsRow` menos autónomo y crea acoplamiento con el shape del translator.
- **`MetricCard` extendido con tono `danger`.** El Figma pide rojo para vencidas y amarillo para próximas — el `SubtitleTone` original solo tenía `warning | success | muted`. Se agregó `danger` mapeado a `text-[var(--color-feedback-error)]`. Cambio backward-compatible (union type ampliado, no default modificado). El único otro consumer de `MetricCard` era el placeholder anterior, ahora eliminado.
- **`AttendanceSearchCard` usa `useCustomerSearch` con dropdown de resultados.** Aunque el modal real no existe todavía, exponer el flujo end-to-end (typing + resultados + click) permite validar en preview que el rate-limit + debounce + query están OK y facilita conectar el modal en el PR siguiente sin re-diseñar la UX. Click en resultado y click en CTA disparan el mismo toast "próximamente" (misma acción semántica).
- **`QuickActionsSection` es client component**, no por complejidad sino porque necesita el handler `onClick` con toast. Igual está bien contenido — solo props internas, sin state.
- **Delegación de sub-componentes en `AttendanceSearchCard`.** Se extrajeron `SearchInput` y `SearchResults` como funciones locales al file. Motivo: la lógica interna del componente cabe cómoda en <100 líneas pero los 3 sub-bloques (input, results loading, results list) tienen concerns visualmente separables. Alineado con `patterns-explicit-variants` — el resultado se lee como 3 componentes claros, no como 1 render con 3 branchings anidados.

## Consideraciones de seguridad

- **Autenticación / Autorización:** sin cambios. Toda la ruta `/v2/*` sigue detrás del guard `hasFeatureFlag('v2_access')` del ADR de Fase 0. `AttendanceSearchCard` llama a `searchCustomer` que ya está rate-limited (bucket `search`, 30/min).
- **Exposición de datos:** las queries de `getHomeMetrics` son head-only (`{ count: 'exact', head: true }`) — no traen rows, solo el count. La RLS existente de `customer_membership` y `assistance` sigue aplicando. `AttendanceSearchCard` lista `first_name`, `last_name`, `person_id` de los matches — los mismos campos que la búsqueda existente en v1.
- **Validación de input:** el search input pasa por el hook con debounce; el `searchCustomer` remoto ya sanitiza el ilike. No hay input de negocio que llegue a mutaciones en este PR (los toasts no gatillan writes).
- **Dependencias:** no se agregan. `sonner` (para toast), `lucide-react`, `use-debounce` ya estaban.
- **Infraestructura:** sin cambios.

## Lecciones aprendidas

- **`MetricCard` era subespecificado para el diseño real.** El PR de Fase 1 introdujo 3 tonos (`success | warning | muted`) mirando solo el placeholder; el Figma real requiere distinguir "vencidas" (rojo) de "próximas" (amarillo). Agregar `danger` acá fue barato porque el primitive tenía un solo consumer; en general vale la pena revisar los primitives del design system cuando llega el primer diseño real que los consume, en vez de asumir que el placeholder capturó todos los tonos.
- **Server → server pasa `t` es válido pero acopla.** Consideré pasar `t` desde `page.tsx` a `MetricsRow` como prop. Técnicamente funciona (React 19 no impone serialización entre server components), pero re-invocar `i18n.fetch(lang, tenant)` cuesta cero por la wrapping en `React.cache` y deja al sub-componente autónomo. Regla: para strings cortos, pasar props ya-resueltas; para sub-componentes con muchas keys propias, mejor que carguen su propio translator.
- **`setUTCDate(day - 7)` es más simple y confiable que restar 7 * 24 * 60 * 60 * 1000 ms.** DST no afecta porque el shift se hace en UTC y el rango final se resuelve con el helper AR-aware — el `Intl.DateTimeFormat` interno del helper aplica el offset correcto para el día shifteado.

## Plan

### Pasos

1. **Dominio `src/home/`:**
   - `consts.ts` → `UPCOMING_EXPIRATION_WINDOW_DAYS = 7`.
   - `types.ts` → `HomeMetrics` con los 5 counters.
   - `api/server.ts` → helpers privados por count (`getAssistancesCountForDay`, `getActiveMembershipsCount`, `getUpcomingExpirationsCount`, `getExpiredMembershipsCount`) y `getHomeMetrics()` público que hace `Promise.all`.

2. **Diccionarios i18n:**
   - Reemplazar el bloque `v2.home.*` (que tenía keys del placeholder + 2 dummy metric strings) por el nuevo:
     - `attendanceSearch.{placeholder, cta, searching, noResults, toastComingSoon, toastComingSoonDescription}`.
     - `metrics.{todayAttendances, noAttendancesRegistered, activeClientsMonth, expiredMembershipsCount, upcomingExpirations, allUpToDate, attendanceDelta.{positive, negative, equal}}`.
     - `quickActions.{title, newCustomer, registerPayment, toastComingSoon, toastComingSoonDescription}`.
   - Espejo en `en.json`.

3. **Componentes:**
   - `AttendanceSearchCard.tsx` (client): search input + dropdown de resultados + CTA. Sub-funciones `SearchInput` y `SearchResults`. Toast en click.
   - `MetricsRow.tsx` (server async): recibe `metrics, lang, tenant`, resuelve subtítulos y tonos con `resolveAttendanceSubtitle` / `resolveActiveClientsSubtitle`, renderiza 2 `MetricCard`.
   - `QuickActionsSection.tsx` (client): título + 2 botones outline. Ambos con toast en click.

4. **Design system primitive:**
   - Agregar tono `danger` a `MetricCard` (mapa `toneClass` extendido con `text-[var(--color-feedback-error)]`).

5. **`page.tsx` de `/v2/home`:**
   - Reemplazar placeholder por composición: `<AttendanceSearchCard />`, `<MetricsRow metrics lang tenant />`, `<QuickActionsSection />`. `Promise.all([params, getHomeMetrics()])` para paralelizar.

6. **ADR:** este documento.

7. **Verificación:**
   - `npm run type-check` sin errores nuevos.
   - `npm run lint` sin errores nuevos.
   - Checklist manual para el user (probar `/v2/home` desktop + mobile, buscar cliente, click en resultado y en CTA → toast, comparar métricas contra la DB, verificar tonos por variante de subtítulo).
