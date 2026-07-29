-- =============================================================================
-- Migration: realinear expense_date de gastos que quedaron en midnight UTC
--            al equivalente midnight AR (+3h).
-- =============================================================================
-- Contexto:
--   Mismo bug que la migración anterior sobre `membership_payments`
--   (`20260729144614_realign_membership_payments_to_ar_midnight.sql`), aplicado
--   a la tabla `expenses`. El form de gastos envía `expense_date` como string
--   "YYYY-MM-DD" al backend, que lo pasa sin canonicalizar a supabase-js.
--   Postgres lo interpreta como midnight UTC = "día anterior 21hs AR".
--
--   Detectado al auditar la tabla siguiendo la lista de call sites pendientes
--   del ADR `20260709153000_representacion-canonica-de-fechas-ar.md` sección
--   "Reincidencia 2026-07-29" — el patrón que agregamos a CLAUDE.md funciona
--   como recordatorio de auditar cada tabla temporal.
--
--   Al momento de esta migración: 6 gastos afectados en la DB de development.
--
-- Fix:
--   Sumar 3 horas a `expense_date` de todos los gastos con hora exactamente
--   `00:00:00 UTC`. Los mueve al día calendario que el operador esperaba.
--
--   El fix causal (que la función server canonicalice antes de insertar) va
--   en el mismo PR: `withCanonicalExpenseDate` en `src/accounting/api/server.ts`.
--
-- Seguridad del filtro:
--   Igual que en la migración de `membership_payments`: los gastos hechos en
--   vivo por operadores humanos nunca aterrizan exactamente a las 00:00:00
--   UTC. Ese timestamp es exclusivo del bug de datepicker → RPC sin canonicalizar.
-- =============================================================================

UPDATE public.expenses
SET expense_date = expense_date + interval '3 hours'
WHERE (expense_date AT TIME ZONE 'UTC')::time = '00:00:00'::time;
