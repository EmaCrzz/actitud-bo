-- =============================================================================
-- Migration: abrir SELECT de discount_rules a authenticated.
-- =============================================================================
-- Contexto:
--   La migración previa (20260722120000) dejó `discount_rules` admin-only
--   en las 4 operaciones, clonando el patrón de `membership_payments` y
--   `expenses`. Ese patrón funciona para tablas financieras porque el flujo
--   de escritura no-admin va vía RPC SECURITY DEFINER que saltea RLS.
--
--   Con `discount_rules` no funciona: el form individual necesita LEER las
--   reglas activas para detectar cuál aplicar (ej. cliente pertenece a un
--   grupo → sugerir la regla 'group_member'). Si el SELECT queda cerrado,
--   un operador employee/manager no ve nada y el bloque de descuento se
--   rompe silenciosamente. La lectura no es sensible — son nombres, tipos
--   y valores de reglas configuradas por el negocio.
--
-- Cambio:
--   SELECT → authenticated (cualquiera puede leer).
--   INSERT/UPDATE/DELETE → siguen admin-only (evita que operadores creen
--   reglas fantasma o modifiquen valores).
-- =============================================================================

DROP POLICY IF EXISTS "Admins can read discount_rules" ON public.discount_rules;

CREATE POLICY "Authenticated can read discount_rules"
  ON public.discount_rules FOR SELECT TO authenticated USING (true);
