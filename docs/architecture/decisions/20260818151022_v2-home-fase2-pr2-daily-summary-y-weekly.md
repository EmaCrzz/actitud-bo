# Home v2 — Fase 2 PR 2: DailySummaryCard + WeeklyAttendanceCard

**Fecha:** 2026-08-18
**Autor:** ema_villanueva@hotmail.com
**Rama:** feat/v2-home-fase2-pr2-daily-summary-y-weekly

## Descripción

Completa la Fase 2 del home v2. Agrega las dos secciones inferiores del diseño Figma que fueron diferidas del PR 1 para mantener el diff revisable: `DailySummaryCard` (resumen de actividad del día) y `WeeklyAttendanceCard` (barras de asistencia Lun–Vie de la semana actual).

Ambos componentes son server components async que reciben su data ya resuelta desde `page.tsx` vía `Promise.all`, siguiendo el mismo patrón que `MetricsRow` en PR 1.

## Decisiones

### Decisiones de negocio

- **Items del DailySummaryCard limitados a 4.** El diseño Figma muestra 5 items incluyendo "Promoción activada". No existe tabla `promotions` en el schema actual; el modelo de descuentos usa `discount_rules` que no tiene semántica de "activación por día". Se omite ese item hasta que exista la tabla. Los 4 implementados (`attendancesWithExpiredMembership`, `paymentsRegistered`, `newCustomers`, `groupsCreated`) tienen tablas claras y semántica inequívoca.
- **Empty state con hourglass cuando todos los counts son 0.** Si hay algún item con count > 0, se muestra solo ese subset (items con 0 se ocultan). Esto sigue el Figma: el estado "sin actividad" es un hourglass, no una lista de ceros.
- **WeeklyAttendanceCard siempre muestra Lun–Vie.** Días futuros aparecen con count 0 y `-` como label de count. Coincide con el Figma de estado vacío donde los 5 días se listan con `-`.
- **Semana = lunes a viernes (5 días).** El Figma solo muestra 5 barras (Lun–Vie). Un gimnasio típico opera M–V como ciclo de referencia, aunque pueda abrir fin de semana; el resumen semanal de asistencia tiene más sentido en ese eje.

### Decisiones técnicas

- **`getWeeklyAttendanceSummary()` reutiliza `getWeekRangeInAppTz()` + `getAssistancesCountForDay()`.** `getWeekRangeInAppTz` ya existe en `src/lib/timezone.ts` y resuelve correctamente el lunes AR del instante dado. De ahí se derivan los 5 días con `shiftIsoDateInAppTz(monIso, i)` → `parseAppTzDateString(iso)` → `getAssistancesCountForDay(date)`. Las 5 queries corren en `Promise.all`. No se agrega ningún helper nuevo a `timezone.ts`.
- **`getDailySummary()` — `attendancesWithExpiredMembership` requiere 2 queries secuenciales.** No hay FK directa entre `assistance` y `customer_membership` (ambas referencian `customers`). PostgREST soporta embedded resources multi-salto (`assistance → customers → customer_membership`) pero el filtro `.lt('customers.customer_membership.expiration_date', ...)` con `head: true` no está garantizado por la versión de supabase-js usada. Se optó por dos queries explícitas: primero los `customer_id` de asistencias de hoy (filas pequeñas, sin limit problemático), luego `count` de `customer_membership.in(ids).lt(expiration_date)`. Las otras 3 sub-queries son head-only directas. Las 4 corren en `Promise.all` externo.
- **`page.tsx` pasa data como props (no fetching dentro del componente).** Mismo patrón que `MetricsRow`. El `Promise.all` del top level del page agrega 2 nuevas entradas: `getDailySummary()` y `getWeeklyAttendanceSummary()`. Esto mantiene el fetch paralelo máximo y los sub-componentes son "dumb" respecto al origen de los datos.
- **Barras del WeeklyAttendanceCard implementadas con CSS puro.** No se agrega ninguna librería de charts. Cada barra es un `<div>` con `style={{ width: \`${pct}%\` }}` donde `pct = Math.round((day.count / max) * 100)`. El track es `bg-muted`, el fill es `bg-foreground`. Cuando `max === 0` todos los anchos son 0% (barras vacías).
- **`DAY_KEYS` como tupla `as const`.** El array `['mon', 'tue', 'wed', 'thu', 'fri']` mapea posicionalmente a los 5 elementos del `WeeklyAttendance`. TypeScript infiere el tipo exacto; la key i18n se construye como template literal `v2.home.weeklyAttendance.days.${dayKey}`.
- **Rama desde `feat/v2-home-skeleton-and-metrics` (no desde develop).** PR 1 no estaba mergeado al arrancar PR 2. Branching desde la feature branch previa crea PRs apilados; cuando PR 1 se mergee, PR 2 se rebasa contra develop. Alternativa descartada: esperar el merge antes de arrancar — innecesario cuando los cambios son aditivos y no conflictivos.
- **`getExpiredMembershipsCount()` restringido a socios con señal de vida en el mes.** La implementación original (`expiration_date < today`, sin más filtros) devolvía el acumulado histórico de toda la DB (194 registros), no los vencidos accionables del mes. Se corrigió para alinear con la regla de `/incomes`: (1) obtener `customer_id`s con al menos una asistencia en el mes actual, (2) contar membresías vencidas solo entre esos IDs, excluyendo VIP y DAILY. Semántica resultante: "socios que vinieron este mes y tienen la membresía vencida" — un número accionable para el staff, no el churn acumulado de años.

## Consideraciones de seguridad

- **Sin cambios en autenticación/autorización.** Las queries nuevas siguen detrás del guard `hasFeatureFlag(FEATURE_FLAGS.V2_ACCESS)` heredado del layout.
- **RLS.** Las tablas `membership_payments`, `customers`, `customer_groups`, `assistance` y `customer_membership` tienen RLS activa. Las queries corren con el server client de Supabase que usa el JWT del usuario autenticado.
- **Exposición de datos.** `getDailySummary()` devuelve solo counts (head-only o count de `.in()`), no rows. `getWeeklyAttendanceSummary()` devuelve counts por día. No se exponen datos de clientes individuales en estas funciones.

## Plan

### Pasos ejecutados

1. **`src/home/types.ts`** — Agrega `DailySummary` (4 counters) y `WeeklyDay` + `WeeklyAttendance`.
2. **`src/home/api/server.ts`** — Agrega `getDailySummary()` y `getWeeklyAttendanceSummary()`. Importa helpers de timezone: `getWeekRangeInAppTz`, `getTodayIsoDateInAppTz`, `shiftIsoDateInAppTz`, `parseAppTzDateString`. Corrige `getExpiredMembershipsCount()` para usar señal de vida mensual + filtro VIP/DAILY (ver decisión técnica correspondiente).
3. **`src/home/components/v2/DailySummaryCard.tsx`** — Server component async. Empty state con `Hourglass` de lucide, lista filtrada de items activos.
4. **`src/home/components/v2/WeeklyAttendanceCard.tsx`** — Server component async. Barras CSS proporcionales al máximo de la semana.
5. **`src/app/[lang]/[tenant]/v2/home/page.tsx`** — `Promise.all` ampliado a 4 entradas. Agrega grid `md:grid-cols-2` para las dos cards nuevas.
6. **Diccionarios i18n** — Keys `v2.home.dailySummary.*` y `v2.home.weeklyAttendance.*` en `es.json` y `en.json`.
7. **`npm run type-check` y `npm run lint`** — 0 errores. 21 warnings, todos preexistentes.
8. **Este ADR.**

### Checklist de pruebas (para el usuario en preview)

- [ ] `/v2/home` carga sin errores, desktop y mobile.
- [ ] **DailySummaryCard — estado vacío:** cuando no hay actividad del día, aparece el hourglass + texto.
- [ ] **DailySummaryCard — con actividad:** registrar al menos una asistencia o pago hoy → el card muestra el item correspondiente con count correcto.
- [ ] **DailySummaryCard — item "asistencias con membresía vencida":** registrar asistencia de un cliente con membresía vencida → aparece con count = 1.
- [ ] **WeeklyAttendanceCard:** las barras reflejan los counts reales de la semana; el día con más asistencias ocupa el 100% del ancho.
- [ ] **WeeklyAttendanceCard — días futuros:** días que aún no ocurrieron muestran `-` y barra vacía.
- [ ] Layout responsive: las dos cards del grid pasan de `2 columns` en desktop a `1 column` en mobile.
- [ ] No hay regresiones en `AttendanceSearchCard`, `MetricsRow` ni `QuickActionsSection`.
