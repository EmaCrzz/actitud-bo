-- =============================================================================
-- Migration: última asistencia denormalizada + vista de listado de clientes
-- =============================================================================
-- Problema: el listado de clientes v2 ordena alfabéticamente, lo que pone
-- arriba a gente que no pisa el gimnasio hace años. Medido sobre dev: de las
-- primeras 20 filas, sólo 3 asistieron en los últimos 30 días y 7 no asistieron
-- nunca. El 41% de la base (223 de 537) nunca registró una asistencia.
--
-- Criterio acordado: **dos grupos**. Arriba, los clientes con actividad
-- reciente, ordenados alfabéticamente (el listado sigue sirviendo como
-- directorio: se busca gente por nombre). Debajo, todo el resto, también
-- alfabético.
--
-- Importante: el corte es por **asistencia**, no por estado de la membresía. Un
-- cliente que viene importa haya pagado o no — de hecho los que vienen y no
-- pagaron son los que hay que cobrar, y hoy quedan enterrados en el alfabeto
-- (39 personas en dev). Y uno que no viene hace 290 días no importa aunque su
-- membresía figure vigente. Es el mismo concepto de "señal de vida" que ya usan
-- `getBillingCycleProgress` y `getExpiredMembershipsCount` para excluir el
-- churn silencioso de los KPIs; acá se aplica por primera vez al listado.
--
-- ## Por qué denormalizar y no calcular el máximo por consulta
--
-- Ordenar por `max(assistance.assistance_date)` exigiría agregar 11k+ filas de
-- `assistance` en **cada carga de página**. Denormalizar la fecha en `customers`
-- convierte eso en leer una columna ya calculada.
--
-- El costo de escritura es **cero**: el trigger `trigger_increment_assistance`
-- ya hacía `UPDATE customers ... WHERE id = NEW.customer_id` para mantener
-- `assistance_count`. Sumar una columna al SET de ese mismo UPDATE no agrega
-- ninguna escritura — es la misma fila, en la misma operación. `assistance_count`
-- ya era el precedente de este patrón en el schema.
--
-- Esto importa especialmente en el tier gratuito de Supabase: la alternativa
-- (vista con agregado, o RPC que joinea y agrupa) gasta CPU compartida en cada
-- request. Esta gasta una sola vez, al insertar la asistencia.
--
-- ## Sobre la vista
--
-- El corte "reciente" depende de `now()`, así que no puede ser una columna
-- generada (Postgres las exige inmutables). La vista lo resuelve calculando el
-- booleano al leer — una comparación por fila, sin joins ni agregados.
--
-- `security_invoker = true` es **obligatorio**: sin él la vista correría con los
-- permisos de su dueño y saltearía las policies RLS de `customers`, exponiendo
-- todas las filas a cualquier usuario autenticado. Con invoker, la RLS de la
-- tabla base se aplica igual que si se consultara `customers` directamente.
--
-- Idempotente: IF NOT EXISTS / OR REPLACE.
-- =============================================================================


-- ==========================================================================
-- 1. Columna denormalizada
-- ==========================================================================
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS last_assistance_date timestamptz;

COMMENT ON COLUMN public.customers.last_assistance_date IS
  'Fecha de la última asistencia registrada. Denormalizada desde public.assistance '
  'por trigger_increment_assistance, igual que assistance_count. NULL = nunca asistió.';


-- ==========================================================================
-- 2. Backfill desde el histórico
-- ==========================================================================
UPDATE public.customers c
SET last_assistance_date = a.last_date
FROM (
  SELECT customer_id, max(assistance_date) AS last_date
  FROM public.assistance
  GROUP BY customer_id
) a
WHERE a.customer_id = c.id
  AND c.last_assistance_date IS DISTINCT FROM a.last_date;


-- ==========================================================================
-- 3. El trigger que ya existía ahora también mantiene la fecha
-- ==========================================================================
-- `GREATEST` en vez de asignar NEW.assistance_date directo: si alguna vez se
-- carga una asistencia retroactiva, no debe pisar una fecha más nueva.
--
-- Nota: igual que `assistance_count`, no se decrementa/recalcula en DELETE.
-- Se mantiene el comportamiento que ya tenía el contador; borrar asistencias no
-- es parte de ningún flujo de la app.
CREATE OR REPLACE FUNCTION public.increment_assistance_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.customers
  SET assistance_count = assistance_count + 1,
      last_assistance_date = GREATEST(
        COALESCE(last_assistance_date, NEW.assistance_date),
        NEW.assistance_date
      )
  WHERE id = NEW.customer_id;

  RETURN NEW;
END;
$function$;


-- ==========================================================================
-- 4. Índice para el orden
-- ==========================================================================
CREATE INDEX IF NOT EXISTS customers_last_assistance_date_idx
  ON public.customers (last_assistance_date DESC NULLS LAST);


-- ==========================================================================
-- 5. Vista del listado
-- ==========================================================================
-- `is_recently_active` es la clave de orden primaria del listado: primero los
-- activos (alfabéticos), después el resto (alfabéticos).
--
-- La ventana de 30 días está acá y también en la app (ACTIVE_WINDOW_DAYS). Si
-- se cambia, hay que cambiarla en los dos lados — la vista ordena y la UI
-- explica el corte al usuario.
DROP VIEW IF EXISTS public.customers_listing;

CREATE VIEW public.customers_listing
WITH (security_invoker = true)
AS
SELECT
  c.*,
  (
    c.last_assistance_date IS NOT NULL
    AND c.last_assistance_date >= (now() - interval '30 days')
  ) AS is_recently_active
FROM public.customers c;

COMMENT ON VIEW public.customers_listing IS
  'Listado de clientes con el flag de actividad reciente que define el orden por '
  'defecto. security_invoker=true: hereda las policies RLS de public.customers.';

GRANT SELECT ON public.customers_listing TO authenticated;
