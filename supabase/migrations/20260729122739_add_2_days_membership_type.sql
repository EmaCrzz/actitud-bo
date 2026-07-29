-- =============================================================================
-- Migration: agregar tipo de membresía "2 días por semana".
-- =============================================================================
-- Contexto:
--   El staff del gym implementó a mitad de julio 2026 una nueva membresía
--   "2 días por semana" (mensual, renovable) que la app no puede trackear.
--   Los socios que la usan se cargaron como MEMBERSHIP_TYPE_3_DAYS, lo cual
--   generó falsos positivos en el dashboard de ingresos (ADR
--   20260728141829_incomes-dashboard-redesign.md).
--
--   Este cambio agrega el tipo a `types_memberships` para que aparezca en el
--   selector del form de membresía y en los agrupamientos del dashboard.
--
-- Precios:
--   Se derivan de MEMBERSHIP_TYPE_3_DAYS como placeholder inicial. El staff
--   los ajustará vía UI en /stats/membership después del deploy. Usar un
--   INSERT ... SELECT (en vez de valores hardcodeados) hace la migración
--   robusta entre entornos: si dev y prod tienen precios distintos para
--   3_days, ambos arrancan con su propio placeholder.
--
-- Idempotencia:
--   ON CONFLICT (type) DO NOTHING para que reruns no fallen si el tipo ya
--   existe. Si por algún motivo la migración necesita re-aplicarse después
--   de que el staff ajustó precios, no los pisa.
--
-- Sin backfill de socios:
--   Los ~4 socios ya cargados como 3_days no se migran automáticamente. El
--   owner los usa como casos de prueba del flujo "editar membresía" para
--   validar end-to-end que el dashboard refleja el cambio de tipo.
-- =============================================================================

INSERT INTO public.types_memberships (type, amount, amount_surcharge, middle_amount)
SELECT 'MEMBERSHIP_TYPE_2_DAYS', amount, amount_surcharge, middle_amount
FROM public.types_memberships
WHERE type = 'MEMBERSHIP_TYPE_3_DAYS'
ON CONFLICT (type) DO NOTHING;
