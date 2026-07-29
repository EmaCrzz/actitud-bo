# Agregar tipo de membresía "2 días por semana"

**Fecha:** 2026-07-29
**Autor:** ema_villanueva@hotmail.com
**Rama:** feat/membership-type-2-days

## Descripción

El staff del gym implementó a mitad de julio 2026 una nueva membresía "2 días por semana" que la app no puede trackear porque `MEMBERSHIP_TYPE_2_DAYS` no existe en el sistema. Los 4 socios que la usan (Lucio Pieri, Francisco Moreira, Edwin Kapobel, Juan Pablo Villanueva) fueron cargados como `MEMBERSHIP_TYPE_3_DAYS`, lo cual hizo que aparecieran en el análisis de pendientes del dashboard de ingresos como falsos positivos (ver ADR `20260728141829_incomes-dashboard-redesign.md`).

Este PR agrega el tipo `MEMBERSHIP_TYPE_2_DAYS` como membresía mensual renovable, siguiendo el mismo patrón que `3_DAYS` y `5_DAYS`.

## Decisiones

### Decisiones de negocio

- **Precios del nuevo tipo: se copian de `MEMBERSHIP_TYPE_3_DAYS` como placeholder.** El staff los ajustará después vía UI en `/stats/membership`. Motivación: evitar hardcodear valores que podrían quedar desactualizados; y no bloquear el rollout esperando a que el owner me confirme los tres montos (`amount`, `amount_surcharge`, `middle_amount`). La migración deriva los valores en SQL — si dev y prod tienen precios distintos de 3_days, ambos se benefician automáticamente.
- **No se hace backfill de los 4 socios ya cargados como 3_days.** El owner decidió dejarlos como están para usarlos como casos de prueba: modificar sus membresías desde la UI al nuevo tipo y validar en vivo que el dashboard de ingresos refleja correctamente el cambio (breakdown por tipo, cycle progress, pendientes). Migrarlos automáticamente saltearía esta validación end-to-end del flujo.
- **No se busca proactivamente otros socios potencialmente mal cargados.** Con los 4 conocidos alcanza para validar la feature. Otros casos aparecerán con el uso normal y el staff los corregirá vía UI.
- **Orden en `MembershipTypeArray`: `[5, 3, 2, DAILY, VIP]`.** Se agrega al final del grupo de mensuales renovables, no reordenando ascendente. Motivación: minimizar cambios visuales para el operador en el selector — el orden actual ya es familiar.

### Decisiones técnicas

- **Color token: `'800'`.** Los tipos existentes usan tokens Tailwind sin un patrón lineal claro (daily=300, 5=500, 3=700, VIP=900). Para 2_days elijo `'800'` porque va entre 3_days y VIP, no choca con ningún token existente, y visualmente lo posiciona cerca de 3_days (patrón "menos días = más oscuro" en el rango de mensuales).
- **Migración usa `INSERT ... SELECT` derivando de `3_DAYS`** en vez de valores hardcodeados. La migración queda idempotente si se combina con `ON CONFLICT (type) DO NOTHING`.
- **Sin cambios en el formulario de membresía ni en dashboards.** El selector del form ya es data-driven (levanta tipos desde `getMembershipTypes()`). El dashboard de ingresos y `/stats/membership` recogen el tipo nuevo automáticamente porque agrupan dinámicamente.

## Consideraciones de seguridad

- **Autenticación / Autorización:** ninguna superficie de auth se toca. La migración solo agrega una fila y no cambia RLS.
- **Exposición de datos:** ninguna. Solo se inserta un registro en `types_memberships`, tabla ya expuesta a usuarios autenticados.
- **Validación de input:** el RPC `upsert_customer_membership_with_payment` valida que `p_membership_type` exista en `types_memberships` (línea 73 de la migración `20260701140000`). El nuevo tipo pasará ese check automáticamente después de la migración.
- **Dependencias:** ninguna nueva.
- **Infraestructura:** migración a través de flujo estándar `npm run db:push-dev` (compartida con preview) y `npm run db:push-prod` cuando se haga release.

## Plan

### Fase 1 — Setup

1. Crear rama `feat/membership-type-2-days` desde `develop`.
2. Crear este ADR.

### Fase 2 — Código

3. Extender `src/membership/consts.ts`:
   - Nueva constante `MEMBERSHIP_TYPE_2_DAYS`.
   - Agregarla a `MembershipTypeArray` en posición índice 2 (después de 3_DAYS, antes de DAILY).
   - Extender union type `MembershipTypes`.
   - Agregar key en `MembershipTranslation`.
   - Agregar key en `MembershipTranslationTwoLines` con `line1: "2"` y `line2` apuntando a la traducción de "Días por semana".
4. Extender `src/lib/i18n/dictionaries/es.json` y `en.json` con las nuevas keys bajo `membership.types.*`.
5. Extender `colorMap` en `src/membership/api/server.ts:190-196` con `MEMBERSHIP_TYPE_2_DAYS: '800'`.

### Fase 3 — Migración

6. Crear `supabase/migrations/<timestamp>_add_2_days_membership_type.sql` con INSERT derivado de 3_DAYS.

### Fase 4 — Verificación

7. `npm run type-check` + `npm run lint` — sin errores nuevos.
8. Reportar cambios + checklist de tests para preview.

### Fase 5 — Deploy

9. Con OK del user: commit + push + PR contra develop.
10. Después del merge: `npm run db:push-dev` para propagar la migración a la DB compartida con preview.

## Lecciones aprendidas

- **El uso de `Record<MembershipTypes, T>` como exhaustive check funcionó a favor.** Al extender el union `MembershipTypes` con `MEMBERSHIP_TYPE_2_DAYS`, TypeScript detectó automáticamente que el mapa `membershipItems` en `src/assistance/customer-counter.tsx:27` estaba incompleto y falló el type-check. Sin ese patrón, el nuevo tipo hubiera renderizado con 0 ítems (fallback silencioso). Vale la pena preferir `Record<MembershipTypes, T>` sobre objects sueltos donde se pueda — el compilador acompaña al agregar tipos.
- **Los dos mapas explícitamente exhaustivos que ya existían (`MembershipTranslation` y `MembershipTranslationTwoLines`) también obligaron a completar las entradas.** Sin ellos, el nuevo tipo hubiera caído en el fallback del translator (`console.warn` + retornar la key). El patrón de `Record<Union, TranslationKey>` es una defensa útil para features multi-tenant a futuro.
- **`colorMap` en `getMembershipStats` NO es exhaustivo (usa `Record<string, string>`).** El compilador no avisa si un tipo queda sin color y cae al fallback `'400'`. Este mapa es candidato a un pequeño refactor para tipar-lo como `Record<MembershipTypes | 'PENDING_PAYMENT', string>` en un futuro cleanup — no en scope de este PR.
