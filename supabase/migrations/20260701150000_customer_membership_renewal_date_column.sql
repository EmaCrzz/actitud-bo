-- =============================================================================
-- Migration: agregar columna `renewal_date` a customer_membership
-- =============================================================================
-- La columna existía en DEV pero nunca se llevó a PROD. La RPC
-- upsert_customer_membership_with_payment (migration 20260701140000)
-- la escribe en cada actualización con now(), y el tipo TS
-- CustomerMembership (src/customer/types.ts) también la declara.
--
-- En PROD, cualquier update de membresía tiraba error:
--   column "renewal_date" of relation "customer_membership" does not exist
--
-- Idempotente: ADD COLUMN IF NOT EXISTS.
-- =============================================================================

ALTER TABLE public.customer_membership
  ADD COLUMN IF NOT EXISTS renewal_date timestamptz NULL;
