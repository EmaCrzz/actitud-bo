-- =============================================================================
-- Migration: index sobre assistance.assistance_date
-- =============================================================================
-- La tabla `assistance` solo tiene PK sobre `id`. Todas las queries por rango
-- de fecha (getAssistancesByDate, get_top_customers_current_month, checks de
-- asistencia diaria en los RPC de upsert_customer_membership_with_payment)
-- resuelven con seq scan.
--
-- Con el volumen actual el seq scan pasa desapercibido, pero al habilitar
-- el navegador de días en /assistances multiplicamos las consultas por rango
-- y conviene tener el índice antes de crecer. Es una migración no-breaking:
-- si se aplica antes o después del release, el código funciona igual.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_assistance_date
  ON public.assistance
  USING btree (assistance_date DESC);
