-- =============================================================================
-- Auditoría de integridad de datos — SOLO LECTURA
-- =============================================================================
-- Para qué: saber en qué estado está *un entorno concreto, hoy*, antes de
-- aplicarle una migración que dependa de los datos.
--
-- El problema que resuelve: las migraciones se escriben midiendo dev, pero
-- `db:push-prod` es un paso **manual** y puede correrse semanas después. Prod
-- sigue operando en el medio, así que el estado que justificó la migración no
-- es necesariamente el estado al aplicarla. Este script vuelve esa medición
-- repetible en vez de un número anotado una vez en un ADR.
--
-- Uso:
--   set -a; . ./.env.local; set +a
--   psql "$SUPABASE_DB_URL_PROD" -f supabase/scripts/audit-integrity.sql
--   psql "$SUPABASE_DB_URL_DEV"  -f supabase/scripts/audit-integrity.sql
--
-- No modifica nada: son todos SELECT. Se puede correr contra producción sin
-- ventana de mantenimiento.
--
-- Cuándo correrlo:
--   - Antes de cada `db:push-prod` que incluya migraciones de datos.
--   - Después de aplicarlas, para confirmar que quedó en cero lo que tenía que
--     quedar en cero.
--   - Periódicamente: los contadores denormalizados derivan solos.
-- =============================================================================

\echo ''
\echo '=== 1. Pagos sin medio de pago ==============================================='
\echo 'Esperado: 0. Si hay filas, la migración 20260917120000 (SET NOT NULL) falla'
\echo 'a propósito y hay que asignarles el método a mano — no hay backfill correcto.'

SELECT count(*) AS pagos_con_payment_method_null
FROM public.membership_payments
WHERE payment_method IS NULL;

SELECT id, customer_id, amount, payment_date
FROM public.membership_payments
WHERE payment_method IS NULL
ORDER BY payment_date DESC
LIMIT 20;

\echo ''
\echo '=== 2. Asistencias duplicadas (mismo cliente, mismo día AR) =================='
\echo 'Antes de la migración 20260917120100: cualquier número, ella los limpia.'
\echo 'Después: tiene que ser 0 — el índice UNIQUE ya no deja crear más.'

SELECT
  count(*)                        AS dias_con_duplicado,
  coalesce(sum(veces - 1), 0)     AS filas_sobrantes,
  count(DISTINCT customer_id)     AS clientes_afectados
FROM (
  SELECT
    customer_id,
    (assistance_date AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AS dia,
    count(*) AS veces
  FROM public.assistance
  GROUP BY 1, 2
  HAVING count(*) > 1
) d;

\echo ''
\echo '=== 3. Deriva de customers.assistance_count =================================='
\echo 'La columna está denormalizada y la mantiene un trigger AFTER INSERT que no'
\echo 'descuenta en DELETE, así que deriva sola con el tiempo. Un valor > 0 acá no'
\echo 'es urgente, pero conviene recomputar cuando aparezca.'

SELECT
  count(*)                                                        AS clientes_desalineados,
  count(*) FILTER (WHERE c.assistance_count > COALESCE(a.n, 0))    AS contador_de_mas,
  count(*) FILTER (WHERE c.assistance_count < COALESCE(a.n, 0))    AS contador_de_menos
FROM public.customers c
LEFT JOIN (
  SELECT customer_id, count(*) AS n FROM public.assistance GROUP BY 1
) a ON a.customer_id = c.id
WHERE c.assistance_count IS DISTINCT FROM COALESCE(a.n, 0);

\echo ''
\echo '=== 4. DNIs duplicados (brecha B5, todavía sin resolver) ====================='
\echo 'No hay constraint que lo impida, así que este número sólo puede crecer.'
\echo 'Ojo al revisar: no todo par es un alta duplicada — puede ser un DNI mal'
\echo 'tipeado entre dos personas distintas. Ver docs/v2/PLAN.md, Fase 7.'

SELECT
  count(*)                    AS dnis_duplicados,
  coalesce(sum(veces), 0)     AS filas_involucradas
FROM (
  SELECT person_id, count(*) AS veces
  FROM public.customers
  WHERE person_id IS NOT NULL AND person_id <> ''
  GROUP BY person_id
  HAVING count(*) > 1
) d;

\echo ''
\echo '=== 5. Clientes sin fila de customer_membership =============================='
\echo 'Estado real y válido ("Sin membresía"), no un defecto. Se mide porque el'
\echo 'listado tiene que seguir renderizándolos — ver decisión B13 en el plan.'

SELECT count(*) AS clientes_sin_membresia
FROM public.customers c
LEFT JOIN public.customer_membership cm ON cm.customer_id = c.id
WHERE cm.customer_id IS NULL;

\echo ''
