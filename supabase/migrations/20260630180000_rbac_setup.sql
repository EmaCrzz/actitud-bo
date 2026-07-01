-- =============================================================================
-- Migration: setup RBAC tables (profile + user_roles)
-- =============================================================================
-- Idempotente: usa IF NOT EXISTS para todas las tablas/índices.
-- Si las tablas ya fueron creadas a mano en algún entorno (como pasó en DEV
-- via supabase/scripts/grant-admin.sql), esta migration pasa sin tocar nada.
-- =============================================================================

CREATE TABLE IF NOT EXISTS profile (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id    uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name  text,
  picture    text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_auth_id_idx ON profile(auth_id);

CREATE TABLE IF NOT EXISTS user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('admin', 'manager', 'employee', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles(user_id);
