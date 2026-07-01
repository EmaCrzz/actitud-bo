-- =============================================================================
-- Migration: helper is_admin() + policies RLS faltantes en types_memberships
-- =============================================================================
-- Crea:
--   1. Función SECURITY DEFINER `public.is_admin(uuid)` reutilizable desde
--      cualquier policy futura.
--   2. Policies UPDATE y DELETE en types_memberships limitadas a admin.
--      Antes solo existían INSERT (authenticated) y SELECT (public),
--      por eso `updateMembershipPrices` fallaba con PGRST116 "0 rows updated"
--      incluso para el dueño.
--
-- Idempotente: CREATE OR REPLACE / DROP POLICY IF EXISTS.
-- =============================================================================

-- 1. Helper reutilizable
CREATE OR REPLACE FUNCTION public.is_admin(auth_uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER -- ejecuta como owner para leer user_roles aunque RLS bloquee al caller
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profile p
    JOIN user_roles ur ON ur.user_id = p.id
    WHERE p.auth_id = auth_uid
      AND ur.role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_admin(uuid) IS
  'Devuelve true si el auth.users.id pasado tiene rol admin en user_roles.';

-- 2. Policies UPDATE/DELETE para types_memberships (admin-only)
DROP POLICY IF EXISTS "Admins can update membership types" ON types_memberships;
CREATE POLICY "Admins can update membership types"
  ON types_memberships
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete membership types" ON types_memberships;
CREATE POLICY "Admins can delete membership types"
  ON types_memberships
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));
