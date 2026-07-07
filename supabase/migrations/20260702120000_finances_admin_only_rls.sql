-- =============================================================================
-- Migration: RLS admin-only para las tablas de finanzas
-- =============================================================================
-- Contexto: hasta ahora `expenses` y `membership_payments` tenían policies
-- laxas (cualquier authenticated podía SELECT/INSERT/UPDATE/DELETE). La única
-- protección real vivía en el código server (`requireAdmin()` en
-- src/accounting/api/server.ts). Si una ruta futura olvida ese guard, la DB no
-- frena nada. Esta migration agrega defensa en profundidad: las tablas de
-- finanzas quedan admin-only también a nivel RLS, alineado con el RBAC
-- (finances:{read,create,update,delete} = admin).
--
-- Por qué es seguro (no rompe el flujo de pago de no-admins):
--   El pago que registra un employee/manager al renovar la membresía de un
--   cliente se inserta vía la función `upsert_customer_membership_with_payment`,
--   que es SECURITY DEFINER y por lo tanto ejecuta como owner, salteando RLS.
--   Los writes/reads DIRECTOS a estas tablas solo ocurren desde el módulo de
--   accounting, que ya exige admin en la capa server.
--
-- Efecto conocido: la versión client de getActiveMemberships
-- (src/membership/api/client.ts) hace un SELECT directo a membership_payments
-- para enriquecer con el último pago en /stats/customers. Para no-admins ese
-- SELECT ahora devuelve 0 filas (RLS filtra), por lo que `last_payment` queda
-- null. La lista de activos sigue funcionando; solo se oculta el monto del
-- último pago a quienes no son admin — que es justamente el objetivo.
--
-- Usa el helper public.is_admin(uuid) creado en 20260630180001.
-- Idempotente: DROP POLICY IF EXISTS + CREATE.
-- =============================================================================


-- ==========================================================================
-- expenses: admin-only en las 4 operaciones
-- ==========================================================================
DROP POLICY IF EXISTS "Authenticated can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated can read expenses"   ON public.expenses;
DROP POLICY IF EXISTS "Authenticated can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated can delete expenses" ON public.expenses;

DROP POLICY IF EXISTS "Admins can read expenses"   ON public.expenses;
DROP POLICY IF EXISTS "Admins can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can delete expenses" ON public.expenses;

CREATE POLICY "Admins can read expenses"
  ON public.expenses FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert expenses"
  ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update expenses"
  ON public.expenses FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete expenses"
  ON public.expenses FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));


-- ==========================================================================
-- membership_payments: admin-only en las 4 operaciones
-- ==========================================================================
DROP POLICY IF EXISTS "Authenticated can insert membership_payments" ON public.membership_payments;
DROP POLICY IF EXISTS "Authenticated can read membership_payments"   ON public.membership_payments;
DROP POLICY IF EXISTS "Authenticated can update membership_payments" ON public.membership_payments;
DROP POLICY IF EXISTS "Authenticated can delete membership_payments" ON public.membership_payments;

DROP POLICY IF EXISTS "Admins can read membership_payments"   ON public.membership_payments;
DROP POLICY IF EXISTS "Admins can insert membership_payments" ON public.membership_payments;
DROP POLICY IF EXISTS "Admins can update membership_payments" ON public.membership_payments;
DROP POLICY IF EXISTS "Admins can delete membership_payments" ON public.membership_payments;

CREATE POLICY "Admins can read membership_payments"
  ON public.membership_payments FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert membership_payments"
  ON public.membership_payments FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update membership_payments"
  ON public.membership_payments FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete membership_payments"
  ON public.membership_payments FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));
