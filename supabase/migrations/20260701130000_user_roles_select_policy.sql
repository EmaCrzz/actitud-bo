-- =============================================================================
-- Migration: policy SELECT en user_roles
-- =============================================================================
-- Sin esta policy, los users autenticados no pueden leer sus propios roles
-- (RLS habilitado + tabla sin policies = 0 rows). Como consecuencia,
-- getCurrentUserRoles() en auth/api/server.ts devolvía [] silenciosamente
-- y isAdmin() era false para todos → los guards de finanzas bloqueaban a
-- todo el mundo, incluso a admins reales.
--
-- Restrictiva: cada user solo lee SUS propios roles (via join con profile).
-- No permite enumerar roles de otros (info sensible: quién es admin).
--
-- Idempotente: DROP POLICY IF EXISTS + CREATE POLICY.
-- =============================================================================

DROP POLICY IF EXISTS "Users can read own roles" ON user_roles;
CREATE POLICY "Users can read own roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM profile WHERE auth_id = auth.uid()));
