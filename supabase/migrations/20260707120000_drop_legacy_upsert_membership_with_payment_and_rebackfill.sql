-- =============================================================================
-- Migration: dropea firma vieja de upsert_customer_membership_with_payment
--            y re-ejecuta backfill de current_payment_id
-- =============================================================================
-- La migración anterior (20260707113341) hizo CREATE OR REPLACE FUNCTION con
-- una firma nueva (agrega p_type_change_action y p_adjustment_amount al
-- final). Postgres trata las funciones con distinta firma como OVERLOADS
-- distintos, no como reemplazos. Como resultado quedaron dos versiones del
-- RPC en la base:
--   1) La vieja con 8 parámetros → hace INSERT ciego, no actualiza
--      current_payment_id.
--   2) La nueva con 10 parámetros → la que queremos.
--
-- Supabase JS resolvía preferencialmente la vieja para llamadas que no
-- incluyeran los dos parámetros nuevos, así que los pagos generados por
-- clientes que aún usaban el cliente viejo (o requests con menos args)
-- no populaban current_payment_id. El resultado: clientes con membresía
-- vigente y current_payment_id NULL.
--
-- Esta migración:
--   1) DROP explícito de la firma antigua para dejar solo la nueva.
--   2) Backfill idempotente de current_payment_id apuntando al pago con
--      created_at más reciente por cliente (mismo criterio que la
--      migración inicial).
-- =============================================================================

DROP FUNCTION IF EXISTS public.upsert_customer_membership_with_payment(
  uuid,
  character varying,
  timestamp with time zone,
  timestamp with time zone,
  boolean,
  character varying,
  real,
  boolean
);

UPDATE public.customer_membership cm
SET current_payment_id = (
  SELECT mp.id
  FROM public.membership_payments mp
  WHERE mp.customer_id = cm.customer_id
  ORDER BY mp.created_at DESC
  LIMIT 1
)
WHERE cm.current_payment_id IS NULL;
