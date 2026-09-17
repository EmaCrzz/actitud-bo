-- =============================================================================
-- Migration: una asistencia por cliente por día calendario argentino
-- =============================================================================
-- Contexto: brecha B4 del plan v2 (docs/v2/PLAN.md) y deuda abierta de la
-- Fase 3. Nada a nivel de base impide registrar dos asistencias del mismo
-- cliente el mismo día.
--
-- Las dos UIs ya lo previenen — el modal v2 deshabilita el botón con
-- `hasAssistanceToday` (AssistanceModal.tsx) y la pantalla v1 calcula lo mismo
-- (assistance/customer.tsx) — y el RPC `upsert_customer_membership_with_payment`
-- devuelve ASSISTANCE_ALREADY_EXISTS en su camino de primera asistencia. Pero
-- las tres son validaciones **check-then-insert**: dos requests concurrentes
-- pueden ver cero y ambas insertar. `createAssistance` además es un INSERT
-- pelado sin ningún chequeo previo. Esta migración agrega la garantía que
-- ninguna de esas capas puede dar.
--
-- POR QUÉ LA EXPRESIÓN CON ZONA NOMBRADA Y NO UN OFFSET FIJO
-- ----------------------------------------------------------
-- El índice tiene que agrupar por *día calendario argentino*, no por día UTC:
-- una asistencia de las 22hs AR es 01:00 UTC del día siguiente, así que un
-- índice sobre `assistance_date::date` dejaría pasar el duplicado justo en el
-- horario pico de la tarde-noche.
--
-- Postgres exige expresiones IMMUTABLE en un índice, y acá la intuición falla:
--
--   (assistance_date - interval '3 hours')::date              -- ✗ RECHAZADO
--   (assistance_date AT TIME ZONE 'America/.../Buenos_Aires')::date  -- ✓ OK
--
-- El atajo del offset fijo falla porque `timestamptz::date` es STABLE: depende
-- del `TimeZone` de la sesión. La forma idiomática funciona porque
-- `timezone(text, timestamptz)` — en la que desazucara `AT TIME ZONE` con zona
-- nombrada — está marcada IMMUTABLE (es la forma de *un* argumento, que lee el
-- TimeZone de sesión, la que es STABLE). Verificado contra la base de dev antes
-- de escribir esto.
--
-- Argentina no tiene DST desde 2009, así que la zona nombrada es estable en la
-- práctica; y si algún día volviera, la zona nombrada haría lo correcto y el
-- offset hardcodeado no.
--
-- LIMPIEZA PREVIA
-- ---------------
-- El índice no se puede crear con duplicados presentes. Medido el 2026-09-17,
-- idéntico en dev y en prod: **28 filas sobrantes en 25 días, 21 clientes
-- afectados**, sobre ~11.400 asistencias (0,25%).
--
-- Se conserva la **primera** asistencia de cada día: es el check-in real, y las
-- posteriores son el mismo registro repetido por doble submit o doble escaneo.
--
-- `customers.assistance_count` está denormalizada y la mantiene el trigger
-- `trigger_increment_assistance`, que es **AFTER INSERT solamente** — no
-- descuenta en DELETE. Por eso el recomputo explícito abajo: sin él, los 21
-- clientes quedarían con el contador inflado y la columna "Asistencias" del
-- listado mentiría.
--
-- El recomputo además destapa y corrige una deriva **preexistente**, ajena a
-- esta limpieza: medido el 2026-09-17, **12 clientes en prod (11 en dev) ya
-- tenían el contador desalineado** — 11 de más y 1 de menos. Los de más son
-- asistencias borradas alguna vez que el trigger INSERT-only nunca descontó; el
-- de menos es un insert que esquivó el trigger (probablemente anterior a que
-- existiera). Entre duplicados y deriva previa, el UPDATE toca ~30 filas.
--
-- Se corrigen todas a propósito: es la misma columna y el mismo criterio de
-- corrección, y recalcular sólo los 21 afectados por el DELETE dejaría
-- deliberadamente mal los otros sabiendo que están mal.
--
-- `customers.last_assistance_date` **no** necesita recomputo: sólo se borran
-- duplicados *del mismo día*, siempre queda una fila de esa fecha, y el máximo
-- no cambia.
--
-- Idempotente: el DELETE no encuentra nada en una segunda corrida y el índice
-- usa IF NOT EXISTS.
-- =============================================================================

-- 1. Borrar los duplicados, conservando la primera asistencia de cada día AR.
DELETE FROM public.assistance a
USING (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY
        customer_id,
        (assistance_date AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
      ORDER BY assistance_date ASC, id ASC
    ) AS posicion_en_el_dia
  FROM public.assistance
) ranked
WHERE a.id = ranked.id
  AND ranked.posicion_en_el_dia > 1;

-- 2. Recomputar el contador denormalizado de los clientes afectados.
--    Se recalcula sobre toda la tabla en vez de restar la diferencia: es una
--    sola pasada sobre ~11.400 filas y deja el contador correcto aunque ya
--    estuviera desalineado por otra razón.
UPDATE public.customers c
SET assistance_count = COALESCE(conteo.total, 0)
FROM (
  SELECT customer_id, count(*) AS total
  FROM public.assistance
  GROUP BY customer_id
) conteo
WHERE c.id = conteo.customer_id
  AND c.assistance_count IS DISTINCT FROM conteo.total;

-- 3. La garantía.
CREATE UNIQUE INDEX IF NOT EXISTS assistance_one_per_customer_per_day_ar
  ON public.assistance (
    customer_id,
    ((assistance_date AT TIME ZONE 'America/Argentina/Buenos_Aires')::date)
  );

COMMENT ON INDEX public.assistance_one_per_customer_per_day_ar IS
  'Una asistencia por cliente por día calendario argentino. El día se deriva '
  'con la zona nombrada (no con un offset fijo) porque timestamptz::date es '
  'STABLE y no se puede indexar, mientras que timezone(text, timestamptz) es '
  'IMMUTABLE. Una violación llega al cliente como código 23505 y la capa de '
  'API la traduce a ASSISTANCE_ALREADY_EXISTS.';
