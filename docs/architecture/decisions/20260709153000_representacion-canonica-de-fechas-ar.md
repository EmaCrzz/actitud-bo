# Representación canónica de fechas de negocio en TZ Argentina

**Fecha:** 2026-07-09
**Autor:** emanuel@getlenk.com
**Rama:** fix/timezone-ar-canonical-dates

## Descripción

El negocio opera en Argentina (America/Argentina/Buenos_Aires, UTC-3). El servidor de Vercel corre en UTC. Muchos call sites del proyecto usaban `new Date().toISOString().slice(0, 10)` para armar "hoy" y `new Date("YYYY-MM-DD")` para parsear strings de fecha; ambos son UTC, no AR. Esta mezcla produjo una cascada de bugs recurrentes:

- **Reportado en esta ronda:** en el form de gestión de membresía de un cliente, al seleccionar tipo Daily y tildar "registrar su asistencia", el form fallaba con "no se puede registrar asistencia para una membresía vencida" — la fecha de fin llegaba como `"2026-07-09"` y al parsearse como medianoche UTC = 21:00 AR del día anterior, la validación creía que ya había vencido.
- **Reportado en la misma ronda:** al renovar Daily sin tildar la asistencia, el pago no aparecía en el módulo de contabilidad. La causa era que `getActiveMemberships` filtraba con `.gt('expiration_date', new Date().toISOString())` y la fila guardaba `expiration_date = 2026-07-09T00:00:00Z`, que es menor que `now()` durante todo el día AR → el registro quedaba excluido.
- **Incidente previo, mismo root cause:** el home dejaba de mostrar los datos del día actual pasadas las 21hs AR y saltaba al día/mes siguiente, porque `use-month-navigation` y `MonthProvider` computaban el mes actual con `.getMonth()` sobre `new Date()` (UTC del server).

Este cambio define una representación canónica única para fechas del negocio y provee helpers para todos los call sites relevantes.

## Decisiones

### Decisiones de negocio

- **Daily siempre requiere pago.** Un pase diario es por definición un cobro puntual. El checkbox "Pagar cuota" queda forzado tildado y `disabled` cuando el tipo es Daily, con tooltip explicativo. Elimina el edge case donde un operador cambiaba de mensual activa a Daily sin re-tildar el checkbox y renovaba sin generar ingreso.
- **`expiration_date` de Daily = fin del día AR.** Una Daily creada hoy debe considerarse activa durante toda la jornada AR, no vencer a las 00:00 UTC del mismo día.

### Decisiones técnicas

- **Canonicalización en el RPC (frontera del backend).** El RPC `upsert_customer_membership_with_payment` sobrescribe `expiration_date` a `23:59:59.999` AR cuando `v_is_daily AND p_is_paid`. Blinda contra cualquier frontend que envíe strings UTC.
    - Alternativa descartada: hacerlo solo en frontend. Frágil ante nuevos call sites o clientes móviles futuros.
    - Alternativa descartada: cambiar la columna a `date`. Rompe la semántica `timestamptz` y obliga a casts en toda la app.
- **Nuevos helpers en [src/lib/timezone.ts](../../../src/lib/timezone.ts):**
    - `getTodayIsoDateInAppTz()` — `"YYYY-MM-DD"` del día AR actual. Reemplaza `new Date().toISOString().slice(0, 10)`.
    - `parseAppTzDateString(iso)` — parsea `"YYYY-MM-DD"` como medianoche AR (no UTC). Reemplaza `new Date(iso)` en flujos de negocio.
    - `getEndOfDayInAppTz(iso)` — retorna el `Date` que representa `23:59:59.999` AR del día indicado.
- **Filtro de "activas" comparado contra inicio de día AR.** `getActiveMemberships` (server y client) ahora usa `getTodayRangeInAppTz().start.toISOString()` en `.gte('expiration_date', ...)`. Junto con el fix del RPC, un Daily creado hoy aparece como activo desde el instante de creación hasta las 24hs AR.
- **`formatDate` con TZ opcional, default AR.** Antes usaba `getDate/getMonth/getFullYear` (TZ del server). Ahora usa `Intl.DateTimeFormat` con `timeZone: APP_TIMEZONE` por default. `getCurrentMonth` también migra a `getAppTzDateParts()`.
- **Migración de otros call sites.** `expenses/form.tsx` (default de `expense_date`), `use-month-navigation` (`isCurrentMonth`), `MonthProvider` (mes inicial), `membership/components/actives.tsx` (próximas a vencer), `shareable-top-image.tsx` (`toLocaleDateString` con `timeZone`), `lib/version.ts` (`buildDate`). Todos comparten el mismo root cause y por eso se atacan en el mismo PR.
- **Fix del alta multi-step (bug estructural preexistente).** Durante el testing descubrimos que el RPC `upsert_customer_with_membership` que usa el alta multi-step **nunca insertaba en `membership_payments` ni canonicalizaba `expiration_date`**. Cualquier cliente creado con Daily (o cualquier tipo) por ese flujo quedaba invisible en Contabilidad. Fix: `_upsertCustomer` en [src/customer/api/client.ts](../../../src/customer/api/client.ts) ahora encadena una segunda llamada a `upsert_customer_membership_with_payment` (el RPC bueno del form de gestión) para registrar el pago, canonicalizar la fecha y registrar la asistencia opcional. Descartada la alternativa de crear un nuevo RPC combinado atómico: reusar el RPC existente evita duplicar lógica y otra migración. Trade-off: si el segundo RPC falla, el cliente queda creado sin pago — retornamos el error del segundo call al UI para que el operador pueda reintentar con "gestionar membresía".

## Consideraciones de seguridad

No se identifican implicaciones de seguridad de esta implementación.

- **Autenticación / Autorización:** sin cambios en RLS ni en checks de rol.
- **Exposición de datos:** ninguna. Solo se ajusta cómo se calcula "hoy" y qué timestamp queda en `expiration_date`.
- **Validación de input:** el RPC sigue validando `customer_id`, `membership_type`, `amount > 0` y VIP-solo-admin.
- **Dependencias:** ninguna nueva; se usa `Intl.DateTimeFormat` nativo y los helpers ya existentes.
- **Infraestructura:** ninguna.

## Lecciones aprendidas

- `new Date("YYYY-MM-DD")` es una **fuente silenciosa de bugs** en cualquier app que opere fuera de UTC. Node y browsers lo parsean como medianoche UTC, no como medianoche local. Todo string de fecha del negocio debe pasar por un parser explícitamente TZ-aware.
- El primer bug (falsa "membresía vencida") se manifestaba en horario diurno AR; el segundo (ingreso invisible) se manifestaba todo el día; el bug del home post-21hs se manifestaba solo por la noche. **Tres síntomas distintos en tres momentos distintos, un solo root cause.** Vale la pena hacer el fix canónico en vez de parchar por síntoma.
- El bug de contabilidad venía por dos caminos independientes: (1) el filtro AR que arreglamos con canonicalización de expiration_date, y (2) el RPC del multi-step que jamás insertaba en `membership_payments`. Solo se detectó el segundo camino cuando el usuario testeó y no encontró el registro esperado. **Lección: tests manuales E2E son irremplazables** — el diagnóstico "en papel" solo cubría el primer camino.

## Reincidencia 2026-07-29

A menos de tres semanas de este ADR, el mismo tipo de bug volvió por un call site no cubierto: la renovación de membresía enviaba los strings del datepicker (`start_date`, `end_date`) directo al RPC `upsert_customer_membership_with_payment` como `p_start_date`/`p_end_date`. Sin canonicalización previa, Postgres los interpreta como midnight UTC y los pagos quedaban con `payment_date = 00:00 UTC` = `21:00 AR del día anterior`. El dashboard de ingresos (que filtra por rango del mes en zona AR) los ubicaba en el mes calendario anterior al esperado.

**Alcance descubierto**: **91 pagos** en la DB de development entre 2026-06-04 y 2026-07-29 tenían `payment_date::time = '00:00:00 UTC'`. Cada uno estaba contando en el mes calendario AR anterior al esperado. El síntoma disparador fue que 2 pagos hechos con el nuevo tipo `MEMBERSHIP_TYPE_2_DAYS` no aparecían en el dashboard de julio a pesar de haberse cargado con fecha "1 de julio".

**Fix aplicado**:

- Nuevo helper local `isoDateToAppTzTimestamp` en [src/customer/api/client.ts](../../../src/customer/api/client.ts) que canonicaliza los strings del datepicker antes de enviarlos al RPC. Aplicado en las 3 llamadas del archivo que pasaban `startDate`/`endDate` a `upsert_customer_with_membership` y `upsert_customer_membership_with_payment`.
- Migración [supabase/migrations/20260729144614_realign_membership_payments_to_ar_midnight.sql](../../../supabase/migrations/20260729144614_realign_membership_payments_to_ar_midnight.sql) con `UPDATE ... SET payment_date = payment_date + interval '3 hours'` filtrando por `(payment_date AT TIME ZONE 'UTC')::time = '00:00:00'`. Realinea los 91 pagos históricos a su día calendario correcto.

**Aprendizaje sistémico**:

- El ADR original arregló los call sites conocidos pero **no estableció una regla de proyecto** que impidiera a nuevos call sites re-introducir el bug. Los helpers existen pero su uso queda dependiendo de la memoria del dev.
- El bug es silencioso — no rompe funcionalidad, solo desplaza timestamps 3 horas — así que puede vivir en producción por meses sin detección visible. Los operadores no "ven" el timestamp, solo ven el número final en el dashboard.
- La disciplina "usar helpers AR" no puede depender del recuerdo individual. **Debe estar documentada como regla de proyecto en `CLAUDE.md`** y auditable con query. Este PR agrega la sección "Fechas y timezone" a `CLAUDE.md`.

**Ampliación de call sites bajo la regla**:

Además de los ya migrados en 2026-07-09, todo lo que envíe fechas a supabase debe ser AR-canonical. Fuentes actuales conocidas:

- Datepicker del form de membresía → `src/customer/api/client.ts` (fixed en este PR).
- Datepicker del form de expenses → `src/expenses/components/form.tsx` (auditar: ¿usa helper?).
- Cualquier `.gte`/`.lte` sobre columnas timestamptz en el frontend (dashboards, listados) → usar `getMonthRangeInAppTz` / `getTodayRangeInAppTz` en vez de `new Date().toISOString()`.

**Pendiente (fuera de scope)**:

- Auditar `src/expenses/components/form.tsx` para confirmar que los expenses no tienen el mismo bug de datepicker → RPC.
- Considerar branded type `AppTzTimestamp` para forzar canonicalización en compile-time (requiere tipar los RPCs, hoy `any`). Ticket aparte.

## Plan

Ver `/Users/emanuelvillanueva/.claude/plans/glowing-bouncing-bee.md` (plan de la sesión).

### Pasos

1. Agregar helpers `getTodayIsoDateInAppTz`, `parseAppTzDateString`, `getEndOfDayInAppTz` en [src/lib/timezone.ts](../../../src/lib/timezone.ts) y exportar `utcInstantAtAppTzWallClock`.
2. Actualizar [src/customer/membership-form.tsx](../../../src/customer/membership-form.tsx): `todayIsoDate` → helper AR, `useEffect` que fuerza `payment = true` para Daily, checkbox disabled para Daily con tooltip.
3. Actualizar [src/customer/utils.ts](../../../src/customer/utils.ts): parsear `start_date`/`end_date` con `parseAppTzDateString` en `basicMembershipValidation`.
4. Crear migración [supabase/migrations/20260709000000_daily_expiration_end_of_day_ar.sql](../../../supabase/migrations/20260709000000_daily_expiration_end_of_day_ar.sql) que canonicaliza `expiration_date` de Daily a fin de día AR.
5. Actualizar filtro de "activas" en [src/membership/api/server.ts](../../../src/membership/api/server.ts) y [src/membership/api/client.ts](../../../src/membership/api/client.ts): `.gte('expiration_date', getTodayRangeInAppTz().start.toISOString())`.
6. Migrar los otros call sites detectados: `expenses/form.tsx`, `actives.tsx`, `month-context.tsx`, `use-month-navigation.ts`, `shareable-top-image.tsx`, `version.ts`, `format-date.ts`.
7. Agregar traducción `membership.dailyAlwaysPaidTooltip` en `es.json` y `en.json`.
8. **Fix del multi-step (agregado post-testing)**: encadenar segundo RPC `upsert_customer_membership_with_payment` en `_upsertCustomer` para registrar pago + canonicalizar fecha + asistencia opcional. Eliminar la llamada duplicada a `createAssistance` (ahora la maneja el segundo RPC).
9. `npm run type-check` + `npm run lint` — reportar warnings nuevos si aparecen.
10. Guía de test UI-only en el PR (dev/preview comparten DB), checklist con golden path + edge cases post-21hs.
