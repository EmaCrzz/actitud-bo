-- =============================================================================
-- Migration: user feature flags (per-user beta / v2 gating)
-- =============================================================================
-- Sistema de feature flags por usuario. Uso inicial: gatear el acceso a la v2
-- rediseñada bajo /[lang]/[tenant]/v2/*. Extensible a futuros betas.
--
-- Idempotente: usa IF NOT EXISTS / DROP POLICY IF EXISTS / CREATE OR REPLACE.
-- =============================================================================

-- 1. Tabla
CREATE TABLE IF NOT EXISTS user_feature_flags (
  user_id    uuid        NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  flag_name  text        NOT NULL,
  enabled    boolean     NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, flag_name)
);

CREATE INDEX IF NOT EXISTS user_feature_flags_user_id_idx ON user_feature_flags(user_id);

COMMENT ON TABLE user_feature_flags IS
  'Feature flags on/off por usuario. Ver docs/architecture/decisions/20260817111834_v2-scaffold-and-feature-flags.md';

-- 2. Helper reutilizable en RLS futuras
CREATE OR REPLACE FUNCTION public.has_feature_flag(auth_uid uuid, flag text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER -- lee flags de cualquier user aunque RLS bloquee al caller
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profile p
    JOIN user_feature_flags uff ON uff.user_id = p.id
    WHERE p.auth_id = auth_uid
      AND uff.flag_name = flag
      AND uff.enabled = true
  );
$$;

COMMENT ON FUNCTION public.has_feature_flag(uuid, text) IS
  'Devuelve true si el auth.users.id pasado tiene el feature flag habilitado.';

-- 3. RLS
ALTER TABLE user_feature_flags ENABLE ROW LEVEL SECURITY;

-- SELECT: cada user ve solo sus propios flags
DROP POLICY IF EXISTS "Users can read own feature flags" ON user_feature_flags;
CREATE POLICY "Users can read own feature flags"
  ON user_feature_flags
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (SELECT id FROM profile WHERE auth_id = auth.uid())
  );

-- INSERT / UPDATE / DELETE: solo admin
DROP POLICY IF EXISTS "Admins can insert feature flags" ON user_feature_flags;
CREATE POLICY "Admins can insert feature flags"
  ON user_feature_flags
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update feature flags" ON user_feature_flags;
CREATE POLICY "Admins can update feature flags"
  ON user_feature_flags
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete feature flags" ON user_feature_flags;
CREATE POLICY "Admins can delete feature flags"
  ON user_feature_flags
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));
