# Canonicalización de `expense_date` a midnight AR

**Fecha:** 2026-07-29
**Autor:** ema_villanueva@hotmail.com
**Rama:** fix/expenses-timezone-canonicalization

## Descripción

Continuación del ADR [20260709153000_representacion-canonica-de-fechas-ar.md](20260709153000_representacion-canonica-de-fechas-ar.md) sección "Reincidencia 2026-07-29", donde documentamos que 91 pagos históricos en `membership_payments` estaban con `payment_date` en midnight UTC (= día anterior 21hs AR) por un call site no cubierto.

Al terminar ese fix, auditamos la tabla `expenses` en busca del mismo pattern:

```sql
SELECT count(*) FROM expenses
WHERE (expense_date AT TIME ZONE 'UTC')::time = '00:00:00';
-- → 6
```

**Confirmado**: el bug también existe en el flow de creación/edición de gastos. El datepicker del form envía el string `"YYYY-MM-DD"` al endpoint, que lo pasa sin canonicalizar a `createExpense` / `updateExpense` server-side, y de ahí a supabase-js que lo inserta como `timestamptz`. Postgres interpreta el string como midnight UTC.

## Decisiones

### Decisiones de negocio

- **Alcance del backfill: los 6 casos existentes.** Mismo criterio que la migración de `membership_payments`: los pagos/gastos hechos por operadores humanos "en vivo" nunca aterrizan exactamente a las 00:00:00 UTC. Ese timestamp es exclusivo del bug. Sumar 3 horas a los 6 los mueve al día calendario correcto sin riesgo.
- **Impacto en reportes**: los stats mensuales de `/stats/accounting` (que calculan `total_expenses` por mes vía `getMonthlyStats`) actualmente están ubicando esos 6 gastos en el mes calendario AR anterior al esperado. Después del fix, los balances mensuales se rebalancean (mismo efecto que ya explicamos para los 91 pagos: totales anuales no cambian, solo se redistribuyen entre meses).

### Decisiones técnicas

- **Canonicalización en el server, no en el form.** El fix va en `createExpense` y `updateExpense` de [src/accounting/api/server.ts](../../../src/accounting/api/server.ts) — la capa que ya existe como único punto de entrada a la tabla `expenses`. Ventaja: blinda contra cualquier caller futuro (mobile app, scripts, otros forms) sin depender de que cada uno recuerde canonicalizar. Es el mismo espíritu que el ADR original aplicó al RPC de membresía.
- **Alternativa descartada**: hacerlo en el form. Es el patrón que aplicamos en el fix de membership (`src/customer/api/client.ts`) porque ese flow pasa por un RPC de Postgres cuyo cambio requiere migración. Para expenses el "server" es TypeScript, es trivial hacerlo ahí y más robusto.
- **Alternativa descartada**: hacerlo en el API route (`/api/accounting/expenses/route.ts`). Es una capa más externa que la función server, y agregar lógica de dominio ahí acopla el transport con el negocio.

## Consideraciones de seguridad

No se identifican implicaciones de seguridad.

- **Autenticación / Autorización**: sin cambios. `createExpense` y `updateExpense` siguen requiriendo `requireAdmin()`.
- **Exposición de datos**: ninguna.
- **Validación de input**: el fix es una transformación defensiva sobre `expense_date`. No relaja ninguna validación existente.
- **Dependencias**: ninguna nueva. Se usa `parseAppTzDateString` que ya está en `src/lib/timezone.ts`.
- **Infraestructura**: la migración es un `UPDATE` acotado a `time = '00:00:00' UTC`, no cambia schema ni policies.

## Lecciones aprendidas

- La regla que agregamos a `CLAUDE.md` en el PR anterior funciona: **el chequeo proactivo del ítem "auditar expenses" (mencionado como pendiente en la sección Reincidencia) es lo que nos hizo correr la query y detectar los 6 casos**. Sin ese ítem escrito, probablemente el bug hubiera quedado silencioso otros N meses.
- Los 6 casos son pocos, pero el bug lleva viviendo tanto como el módulo de expenses. Si no se hubiera detectado por la auditoría, hubieran sido más con el tiempo.

## Plan

### Pasos

1. Crear rama `fix/expenses-timezone-canonicalization` desde `develop`.
2. Crear este ADR.
3. Modificar [src/accounting/api/server.ts](../../../src/accounting/api/server.ts):
   - Importar `parseAppTzDateString` de `@/lib/timezone`.
   - En `createExpense` y `updateExpense`, canonicalizar `expense_date` antes del INSERT/UPDATE si viene definido.
4. Crear migración `supabase/migrations/<timestamp>_realign_expenses_to_ar_midnight.sql` con `UPDATE ... SET expense_date = expense_date + interval '3 hours'` filtrando por `(expense_date AT TIME ZONE 'UTC')::time = '00:00:00'`.
5. `npm run type-check` + `npm run lint`.
6. Reportar cambios + checklist para el user.
7. Con OK: commit + push + PR contra `develop`. Después del merge: `npm run db:push-dev` para aplicar la migración.
