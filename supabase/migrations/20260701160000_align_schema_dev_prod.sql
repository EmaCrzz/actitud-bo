-- =============================================================================
-- Migration: alinear schema DEV/PROD + cleanup de policies
-- =============================================================================
-- Auditoría 2026-07-01: comparación de constraints, RLS, policies y triggers.
--
-- Divergencias detectadas:
--   1. RLS deshabilitado en user_roles de DEV (habilitado en PROD)
--   2. FKs sin CASCADE en DEV: assistance, customer_membership (x2), profile
--      (en PROD ya tienen ON UPDATE CASCADE ON DELETE CASCADE)
--   3. UNIQUE en customer_membership tiene nombres distintos entre entornos
--      (customer_membership_customer_id_unique vs _key)
--   4. Trigger `trigger_increment_assistance` existe en PROD, falta en DEV
--      (sin él las asistencias no incrementan customers.assistance_count)
--   5. Policies laxas en PROD anulan el guard de admin en types_memberships:
--      cualquier authenticated puede editar precios via API directa
--   6. Policies duplicadas en varias tablas (assistance, customer_membership,
--      customers, membership_payments, expenses, types_memberships)
--
-- Objetivo: dejar ambos entornos idénticos con el estado más seguro y limpio.
-- Idempotente: DROP IF EXISTS + CREATE / CREATE OR REPLACE.
-- =============================================================================


-- ==========================================================================
-- 1. Habilitar RLS en user_roles (afecta solo DEV; PROD ya lo tiene)
-- ==========================================================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;


-- ==========================================================================
-- 2. FKs con CASCADE (afecta solo DEV; PROD ya las tiene con CASCADE)
-- ==========================================================================
ALTER TABLE public.assistance DROP CONSTRAINT IF EXISTS assistance_customer_id_fkey;
ALTER TABLE public.assistance ADD CONSTRAINT assistance_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.customer_membership DROP CONSTRAINT IF EXISTS customer_membership_customer_id_fkey;
ALTER TABLE public.customer_membership ADD CONSTRAINT customer_membership_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.customer_membership DROP CONSTRAINT IF EXISTS customer_membership_membership_type_fkey;
ALTER TABLE public.customer_membership ADD CONSTRAINT customer_membership_membership_type_fkey
  FOREIGN KEY (membership_type) REFERENCES public.types_memberships(type)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.profile DROP CONSTRAINT IF EXISTS profile_auth_id_fkey;
ALTER TABLE public.profile ADD CONSTRAINT profile_auth_id_fkey
  FOREIGN KEY (auth_id) REFERENCES auth.users(id)
  ON UPDATE CASCADE ON DELETE CASCADE;


-- ==========================================================================
-- 3. Nombre canónico del UNIQUE en customer_membership
-- ==========================================================================
ALTER TABLE public.customer_membership DROP CONSTRAINT IF EXISTS customer_membership_customer_id_key;
ALTER TABLE public.customer_membership DROP CONSTRAINT IF EXISTS customer_membership_customer_id_unique;
ALTER TABLE public.customer_membership ADD CONSTRAINT customer_membership_customer_id_unique UNIQUE (customer_id);


-- ==========================================================================
-- 4. Trigger de assistance_count (afecta solo DEV; PROD ya lo tiene)
-- ==========================================================================
DROP TRIGGER IF EXISTS trigger_increment_assistance ON public.assistance;
CREATE TRIGGER trigger_increment_assistance
  AFTER INSERT ON public.assistance
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_assistance_count();


-- ==========================================================================
-- 5. Cleanup de policies: dejar un set canónico por tabla
-- ==========================================================================

-- ---- assistance: INSERT + SELECT para authenticated ------------------------
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.assistance;
DROP POLICY IF EXISTS "Enable read access for all users"           ON public.assistance;
DROP POLICY IF EXISTS "Users can insert assistance"                ON public.assistance;
DROP POLICY IF EXISTS "Users can view all assistance"              ON public.assistance;
CREATE POLICY "Authenticated can insert assistance"
  ON public.assistance FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can read assistance"
  ON public.assistance FOR SELECT TO authenticated USING (true);


-- ---- customer_membership: INSERT + SELECT + UPDATE (RPC usa UPSERT) --------
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.customer_membership;
DROP POLICY IF EXISTS "Enable read access for all users"           ON public.customer_membership;
DROP POLICY IF EXISTS "Users can insert memberships"               ON public.customer_membership;
DROP POLICY IF EXISTS "Users can view all memberships"             ON public.customer_membership;
DROP POLICY IF EXISTS "Users can update memberships"               ON public.customer_membership;
CREATE POLICY "Authenticated can insert customer_membership"
  ON public.customer_membership FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can read customer_membership"
  ON public.customer_membership FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update customer_membership"
  ON public.customer_membership FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


-- ---- customers: INSERT + SELECT + UPDATE ----------------------------------
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.customers;
DROP POLICY IF EXISTS "Enable read access for all users"           ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers"                 ON public.customers;
DROP POLICY IF EXISTS "Users can update customers"                 ON public.customers;
CREATE POLICY "Authenticated can insert customers"
  ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can read customers"
  ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update customers"
  ON public.customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


-- ---- expenses: INSERT + SELECT + UPDATE + DELETE (código usa las 4) --------
DROP POLICY IF EXISTS "Allow authenticated users to insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow authenticated users to view expenses"   ON public.expenses;
DROP POLICY IF EXISTS "Allow authenticated users to update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Enable delete for authenticated users only"   ON public.expenses;
DROP POLICY IF EXISTS "Enable insert for authenticated users only"   ON public.expenses;
DROP POLICY IF EXISTS "Enable read access for all users"             ON public.expenses;
DROP POLICY IF EXISTS "Enable update for authenticated users only"   ON public.expenses;
CREATE POLICY "Authenticated can insert expenses"
  ON public.expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can read expenses"
  ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update expenses"
  ON public.expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete expenses"
  ON public.expenses FOR DELETE TO authenticated USING (true);


-- ---- membership_payments: INSERT + SELECT + UPDATE + DELETE ----------------
DROP POLICY IF EXISTS "Allow authenticated users to insert membership_payments" ON public.membership_payments;
DROP POLICY IF EXISTS "Allow authenticated users to view membership_payments"   ON public.membership_payments;
DROP POLICY IF EXISTS "Allow authenticated users to update membership_payments" ON public.membership_payments;
DROP POLICY IF EXISTS "Enable insert for authenticated users only"              ON public.membership_payments;
DROP POLICY IF EXISTS "Enable read access for all users"                        ON public.membership_payments;
CREATE POLICY "Authenticated can insert membership_payments"
  ON public.membership_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can read membership_payments"
  ON public.membership_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update membership_payments"
  ON public.membership_payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete membership_payments"
  ON public.membership_payments FOR DELETE TO authenticated USING (true);


-- ---- profile: SELECT authenticated (endurecemos: antes era public) --------
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profile;
CREATE POLICY "Authenticated can read profile"
  ON public.profile FOR SELECT TO authenticated USING (true);


-- ---- types_memberships: SELECT authenticated + UPDATE/DELETE admin only ---
-- Quitamos las laxas que anulaban el guard de admin.
DROP POLICY IF EXISTS "Enable insert for authenticated users only"        ON public.types_memberships;
DROP POLICY IF EXISTS "Enable read access for all users"                  ON public.types_memberships;
DROP POLICY IF EXISTS "Users can view membership types"                   ON public.types_memberships;
DROP POLICY IF EXISTS "Allow authenticated users to update types_memberships" ON public.types_memberships;
DROP POLICY IF EXISTS "Admins can update membership types"                ON public.types_memberships;
DROP POLICY IF EXISTS "Admins can delete membership types"                ON public.types_memberships;
CREATE POLICY "Authenticated can read types_memberships"
  ON public.types_memberships FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can update types_memberships"
  ON public.types_memberships FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete types_memberships"
  ON public.types_memberships FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));


-- ---- user_roles: SELECT own (ya la teníamos, la recreamos por consistencia)
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM public.profile WHERE auth_id = auth.uid()));
