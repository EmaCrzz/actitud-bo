-- =============================================================================
-- Setup RBAC: crea tablas `profile` y `user_roles` si no existen,
-- y asegura rol `admin` para el email indicado.
-- =============================================================================
-- Pegá este archivo en el SQL Editor de Supabase del entorno deseado
-- (DEV para probar, PROD para uso real).
--
-- Reemplazá el email en el bloque DO si querés dar admin a otra cuenta.
--
-- Es idempotente: crea tablas con IF NOT EXISTS, inserta perfil/rol con
-- ON CONFLICT. Se puede correr varias veces sin acumular basura.
--
-- IMPORTANTE: NO habilita RLS porque el código actual (server-side con
-- service-role key) asume tablas accesibles. Si más adelante querés
-- habilitar RLS, habrá que sumar policies separadas.
-- =============================================================================

-- 1. Tabla `profile`: perfil vinculado a auth.users
CREATE TABLE IF NOT EXISTS profile (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id    uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name  text,
  picture    text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_auth_id_idx ON profile(auth_id);

-- 2. Tabla `user_roles`: rol asignado a un profile
CREATE TABLE IF NOT EXISTS user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('admin', 'manager', 'employee', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles(user_id);

-- 3. Asignar rol admin al email indicado
DO $$
DECLARE
  v_email      text := 'emanuel@getlenk.com';  -- ← cambiar si hace falta
  v_auth_id    uuid;
  v_profile_id uuid;
BEGIN
  -- Buscar el auth.users.id por email
  SELECT id INTO v_auth_id
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;

  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'No existe ningún usuario en auth.users con email %. Registralo primero en /auth/login.', v_email;
  END IF;

  -- Asegurar el profile (crear si falta)
  SELECT id INTO v_profile_id
  FROM profile
  WHERE auth_id = v_auth_id
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    INSERT INTO profile (auth_id, first_name)
    VALUES (v_auth_id, split_part(v_email, '@', 1))
    RETURNING id INTO v_profile_id;

    RAISE NOTICE 'Profile creado para %: %', v_email, v_profile_id;
  ELSE
    RAISE NOTICE 'Profile ya existe para %: %', v_email, v_profile_id;
  END IF;

  -- Asegurar el rol admin (idempotente)
  INSERT INTO user_roles (user_id, role)
  VALUES (v_profile_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Rol admin asegurado para % (profile %)', v_email, v_profile_id;
END $$;

-- 4. Verificación
SELECT
  p.id   AS profile_id,
  p.auth_id,
  p.first_name,
  ur.role,
  u.email
FROM profile p
JOIN user_roles ur ON ur.user_id = p.id
JOIN auth.users u  ON u.id = p.auth_id
WHERE u.email = 'emanuel@getlenk.com';
