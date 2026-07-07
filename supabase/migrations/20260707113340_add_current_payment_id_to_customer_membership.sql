-- =============================================================================
-- Migration: agrega customer_membership.current_payment_id
-- =============================================================================
-- Antes, la asociación entre customer_membership y su pago vigente en
-- membership_payments se reconstruía por match de valores mutables
-- (payment_date + membership_type). Cuando el operador editaba esos campos,
-- el vínculo se perdía y el flujo caía en INSERT, generando duplicados.
--
-- Esta FK explícita apunta al pago vigente y sobrevive a cualquier edición
-- del pago. El nuevo RPC upsert_customer_membership_with_payment usa esta
-- referencia para decidir UPDATE (mismo pago) vs INSERT (renovación).
--
-- Idempotente: guardas por existencia de columna.
-- =============================================================================

ALTER TABLE public.customer_membership
  ADD COLUMN IF NOT EXISTS current_payment_id uuid
  REFERENCES public.membership_payments(id) ON DELETE SET NULL;

-- Backfill: para cada customer_membership sin puntero, apuntar al pago
-- más recientemente insertado del cliente (heurística consistente con la
-- lectura actual del detalle en searchCustomersById).
--
-- Nota: en presencia de duplicados históricos, este UPDATE apunta al
-- created_at más nuevo. Cuando el equipo limpie duplicados en prod, si el
-- pago apuntado es eliminado el ON DELETE SET NULL deja current_payment_id
-- en NULL y el próximo submit del form recompone el puntero con un INSERT.
UPDATE public.customer_membership cm
SET current_payment_id = (
  SELECT mp.id
  FROM public.membership_payments mp
  WHERE mp.customer_id = cm.customer_id
  ORDER BY mp.created_at DESC
  LIMIT 1
)
WHERE cm.current_payment_id IS NULL;
