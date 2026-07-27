-- =============================================================================
-- Migration: grupos familiares como entidad de primera clase y descuentos como
--            modelo relacional (regla + ad-hoc) en membership_payments.
-- =============================================================================
-- Contexto:
--   El gimnasio aplica un descuento fijo de $2.000 al segundo integrante de
--   un grupo familiar, pero la app no lo reflejaba: los pagos se registraban
--   por el neto cobrado, sin distinguir bruto y descuento. La única forma de
--   dejar constancia era un caso en `notes`, sin trazabilidad ni auditoría.
--
--   Esta migración introduce:
--     1) `customer_groups` + `customer_group_members` como entidades de
--        primera clase. Modela el vínculo entre clientes (family hoy, deja
--        `type` extensible a couple/corporate/etc.) con historial vía
--        `left_at` para preservar auditoría de pagos viejos.
--     2) `discount_rules` como catálogo configurable (tipo fixed/percent,
--        `applies_to` en un enum extensible). Se seed-ea con la única regla
--        activa hoy ("2do integrante grupo familiar", fixed 2000). La
--        edición desde UI queda para cuando se comercialice la app; hoy se
--        gestiona vía SQL/panel Supabase.
--     3) Cuatro columnas nuevas en `membership_payments`:
--          - `gross_amount` (NOT NULL, backfilled desde `amount`)
--          - `discount_amount` (default 0, NOT NULL)
--          - `discount_rule_id` (nullable, ON DELETE SET NULL para preservar
--            pagos históricos si se borra la regla)
--          - `discount_note` (obligatoria por CHECK si hay descuento sin
--            regla — trazabilidad forzada a nivel base, no confía en el UI)
--        Se mantiene `amount` como el neto para no romper callers actuales;
--        un CHECK impone `amount = gross_amount - discount_amount`.
--     4) `upsert_customer_membership_with_payment` recibe 4 params nuevos
--        opcionales para propagar bruto/descuento al INSERT/UPDATE del pago.
--        Los defaults preservan el comportamiento actual para callers que
--        aún no envíen descuento (multi-step de alta de cliente sigue OK).
--
-- Por qué es seguro deployar antes que el release del código:
--   Los 4 params del RPC son opcionales con defaults que reproducen el
--   comportamiento previo (gross = p_amount, discount = 0). El código viejo
--   sigue llamando al RPC igual y la base backfilea `gross_amount = amount`.
--
-- Idempotencia:
--   CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS + CREATE OR REPLACE.
--   El seed de `discount_rules` usa ON CONFLICT DO NOTHING vía UNIQUE(name).
-- =============================================================================


-- ==========================================================================
-- 1) Tablas nuevas
-- ==========================================================================

CREATE TABLE IF NOT EXISTS public.customer_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        varchar NOT NULL DEFAULT 'family',
  name        varchar NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_groups_type_check
    CHECK (type IN ('family'))
);

COMMENT ON TABLE public.customer_groups IS
  'Vínculo entre clientes (family hoy; type queda extensible). El descuento no vive acá, vive en la regla + el pago.';


CREATE TABLE IF NOT EXISTS public.customer_group_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     uuid NOT NULL REFERENCES public.customer_groups(id) ON DELETE CASCADE,
  customer_id  uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  joined_at    timestamptz NOT NULL DEFAULT now(),
  left_at      timestamptz,
  CONSTRAINT customer_group_members_joined_before_left
    CHECK (left_at IS NULL OR left_at >= joined_at)
);

-- Un cliente no puede estar dos veces activo en el mismo grupo (pero sí
-- puede re-entrar tras salir: joined_at distinto).
CREATE UNIQUE INDEX IF NOT EXISTS uq_cgm_active_membership
  ON public.customer_group_members(group_id, customer_id)
  WHERE left_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cgm_customer_active
  ON public.customer_group_members(customer_id)
  WHERE left_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cgm_group_active
  ON public.customer_group_members(group_id)
  WHERE left_at IS NULL;

COMMENT ON TABLE public.customer_group_members IS
  'N:M cliente-grupo con historial. left_at nullable: al quitar a alguien no se borra la fila para preservar auditoría de pagos viejos.';


CREATE TABLE IF NOT EXISTS public.discount_rules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        varchar NOT NULL UNIQUE,
  type        varchar NOT NULL,
  value       real NOT NULL,
  applies_to  varchar NOT NULL,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discount_rules_type_check
    CHECK (type IN ('fixed', 'percent')),
  CONSTRAINT discount_rules_value_positive
    CHECK (value > 0),
  CONSTRAINT discount_rules_applies_to_check
    CHECK (applies_to IN ('group_member', 'manual', 'promo'))
);

COMMENT ON TABLE public.discount_rules IS
  'Catálogo de reglas de descuento. type=percent no se usa hoy pero deja lista la extensión. Aplicación siempre se materializa en monto absoluto en el pago (independiente del precio vigente).';


-- ==========================================================================
-- 2) Seed inicial: la única regla activa hoy
-- ==========================================================================

INSERT INTO public.discount_rules (name, type, value, applies_to)
VALUES ('2do integrante grupo familiar', 'fixed', 2000, 'group_member')
ON CONFLICT (name) DO NOTHING;


-- ==========================================================================
-- 3) Columnas nuevas en membership_payments
-- ==========================================================================

ALTER TABLE public.membership_payments
  ADD COLUMN IF NOT EXISTS gross_amount     real,
  ADD COLUMN IF NOT EXISTS discount_amount  real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_rule_id uuid REFERENCES public.discount_rules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_note    text;

-- Backfill: para pagos previos no había descuento, así que bruto = neto.
UPDATE public.membership_payments
SET gross_amount = amount
WHERE gross_amount IS NULL;

ALTER TABLE public.membership_payments
  ALTER COLUMN gross_amount SET NOT NULL;

-- Constraints — se agregan al final para que el backfill pueda correr sin bloqueos.
ALTER TABLE public.membership_payments
  DROP CONSTRAINT IF EXISTS membership_payments_gross_positive;
ALTER TABLE public.membership_payments
  ADD  CONSTRAINT membership_payments_gross_positive
       CHECK (gross_amount > 0);

ALTER TABLE public.membership_payments
  DROP CONSTRAINT IF EXISTS membership_payments_discount_nonneg;
ALTER TABLE public.membership_payments
  ADD  CONSTRAINT membership_payments_discount_nonneg
       CHECK (discount_amount >= 0);

ALTER TABLE public.membership_payments
  DROP CONSTRAINT IF EXISTS membership_payments_amount_matches;
ALTER TABLE public.membership_payments
  ADD  CONSTRAINT membership_payments_amount_matches
       CHECK (amount = gross_amount - discount_amount);

-- Trazabilidad forzada: descuento sin regla exige nota no vacía.
ALTER TABLE public.membership_payments
  DROP CONSTRAINT IF EXISTS membership_payments_adhoc_requires_note;
ALTER TABLE public.membership_payments
  ADD  CONSTRAINT membership_payments_adhoc_requires_note
       CHECK (
         discount_amount = 0
         OR discount_rule_id IS NOT NULL
         OR (discount_note IS NOT NULL AND length(btrim(discount_note)) > 0)
       );

CREATE INDEX IF NOT EXISTS idx_membership_payments_discount_rule_id
  ON public.membership_payments(discount_rule_id)
  WHERE discount_rule_id IS NOT NULL;


-- ==========================================================================
-- 4) RLS: grupos = authenticated full, discount_rules = admin-only
-- ==========================================================================

ALTER TABLE public.customer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_rules ENABLE ROW LEVEL SECURITY;

-- customer_groups
DROP POLICY IF EXISTS "Authenticated can read customer_groups"   ON public.customer_groups;
DROP POLICY IF EXISTS "Authenticated can insert customer_groups" ON public.customer_groups;
DROP POLICY IF EXISTS "Authenticated can update customer_groups" ON public.customer_groups;
DROP POLICY IF EXISTS "Authenticated can delete customer_groups" ON public.customer_groups;

CREATE POLICY "Authenticated can read customer_groups"
  ON public.customer_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert customer_groups"
  ON public.customer_groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update customer_groups"
  ON public.customer_groups FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete customer_groups"
  ON public.customer_groups FOR DELETE TO authenticated USING (true);

-- customer_group_members
DROP POLICY IF EXISTS "Authenticated can read customer_group_members"   ON public.customer_group_members;
DROP POLICY IF EXISTS "Authenticated can insert customer_group_members" ON public.customer_group_members;
DROP POLICY IF EXISTS "Authenticated can update customer_group_members" ON public.customer_group_members;
DROP POLICY IF EXISTS "Authenticated can delete customer_group_members" ON public.customer_group_members;

CREATE POLICY "Authenticated can read customer_group_members"
  ON public.customer_group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert customer_group_members"
  ON public.customer_group_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update customer_group_members"
  ON public.customer_group_members FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete customer_group_members"
  ON public.customer_group_members FOR DELETE TO authenticated USING (true);

-- discount_rules: admin-only (misma política que membership_payments/expenses)
DROP POLICY IF EXISTS "Admins can read discount_rules"   ON public.discount_rules;
DROP POLICY IF EXISTS "Admins can insert discount_rules" ON public.discount_rules;
DROP POLICY IF EXISTS "Admins can update discount_rules" ON public.discount_rules;
DROP POLICY IF EXISTS "Admins can delete discount_rules" ON public.discount_rules;

CREATE POLICY "Admins can read discount_rules"
  ON public.discount_rules FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert discount_rules"
  ON public.discount_rules FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update discount_rules"
  ON public.discount_rules FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete discount_rules"
  ON public.discount_rules FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));


-- ==========================================================================
-- 5) RPC: propagar bruto/descuento al INSERT/UPDATE del pago
-- ==========================================================================
-- Cambios respecto a la versión previa (20260708152529):
--   - 4 params nuevos al final, opcionales con defaults compatibles:
--       p_gross_amount   (default: p_amount → bruto = neto, sin descuento)
--       p_discount_amount (default 0)
--       p_discount_rule_id (default NULL)
--       p_discount_note (default NULL)
--   - Validación defensiva: si hay discount > 0 y no hay regla, exige nota.
--     La base tiene el CHECK igual, pero validar acá devuelve un error_code
--     amigable en lugar de un 23514 opaco.
--   - INSERT y UPDATE del pago escriben las 4 columnas nuevas.
--   - El flujo charge_diff (diferencia por upgrade) NO usa descuentos, así
--     que setea gross_amount = amount, discount_amount = 0 explícitamente.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.upsert_customer_membership_with_payment(
  p_customer_id uuid,
  p_membership_type character varying,
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone,
  p_is_paid boolean,
  p_payment_type character varying,
  p_amount real,
  p_register_assistance boolean DEFAULT false,
  p_type_change_action character varying DEFAULT NULL,
  p_adjustment_amount real DEFAULT NULL,
  p_gross_amount real DEFAULT NULL,
  p_discount_amount real DEFAULT 0,
  p_discount_rule_id uuid DEFAULT NULL,
  p_discount_note text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current             public.customer_membership%ROWTYPE;
  v_membership_id       uuid;
  v_new_payment_id      uuid;
  v_assistance_id       uuid;
  v_today_start         timestamp with time zone;
  v_today_end           timestamp with time zone;
  v_today_date          date;
  v_existing_assistance_count int;
  v_is_active           boolean;
  v_same_type           boolean;
  v_is_daily            boolean;
  v_is_vip              boolean;
  v_is_type_change      boolean;
  v_can_update_current  boolean;
  v_new_type_amount     real;
  v_customer_first_name text;
  v_customer_last_name  text;
  v_error_detail        text;
  v_gross               real;
  v_discount            real;
BEGIN
  RAISE NOTICE 'Function called: customer=%, type=%, is_paid=%, type_change_action=%, discount=%',
    p_customer_id, p_membership_type, p_is_paid, p_type_change_action, p_discount_amount;

  IF p_customer_id IS NULL THEN
    RETURN json_build_object(
      'success', false, 'error_code', 'MISSING_CUSTOMER_ID',
      'message', 'El ID del cliente es requerido', 'operation', 'validate'
    );
  END IF;

  IF p_membership_type IS NULL OR p_membership_type = '' THEN
    RETURN json_build_object(
      'success', false, 'error_code', 'MISSING_MEMBERSHIP_TYPE',
      'message', 'El tipo de membresía es requerido', 'operation', 'validate'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = p_customer_id) THEN
    RETURN json_build_object(
      'success', false, 'error_code', 'CUSTOMER_NOT_FOUND',
      'message', 'Cliente no encontrado', 'operation', 'validate'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.types_memberships WHERE type = p_membership_type) THEN
    RETURN json_build_object(
      'success', false, 'error_code', 'INVALID_MEMBERSHIP_TYPE',
      'message', 'Tipo de membresía no válido', 'operation', 'validate'
    );
  END IF;

  IF p_membership_type = 'MEMBERSHIP_TYPE_VIP' AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profile p ON p.id = ur.user_id
    WHERE p.auth_id = auth.uid() AND ur.role = 'admin'
  ) THEN
    RETURN json_build_object(
      'success', false, 'error_code', 'UNAUTHORIZED_VIP_ASSIGNMENT',
      'message', 'Solo los administradores pueden asignar membresía VIP',
      'operation', 'validate'
    );
  END IF;

  -- Normalización de descuento:
  --   * Si el caller no envía p_gross_amount, asumimos que no hay descuento
  --     (bruto = neto). Compatibilidad hacia atrás con callers viejos.
  --   * Si envía discount_amount > 0 sin regla ni nota → error amigable
  --     antes de que la base lance CHECK 23514.
  v_discount := COALESCE(p_discount_amount, 0);
  v_gross    := COALESCE(p_gross_amount, p_amount);

  IF v_discount > 0
     AND p_discount_rule_id IS NULL
     AND (p_discount_note IS NULL OR btrim(p_discount_note) = '')
  THEN
    RETURN json_build_object(
      'success', false, 'error_code', 'DISCOUNT_NOTE_REQUIRED',
      'message', 'El descuento ad-hoc requiere una nota que lo justifique',
      'operation', 'validate'
    );
  END IF;

  IF v_discount > 0 AND p_amount IS NOT NULL AND abs((v_gross - v_discount) - p_amount) > 0.01 THEN
    RETURN json_build_object(
      'success', false, 'error_code', 'DISCOUNT_MATH_MISMATCH',
      'message', 'El monto neto no coincide con bruto - descuento',
      'operation', 'validate'
    );
  END IF;

  SELECT * INTO v_current
  FROM public.customer_membership
  WHERE customer_id = p_customer_id
  FOR UPDATE;

  SELECT first_name, last_name
  INTO v_customer_first_name, v_customer_last_name
  FROM public.customers
  WHERE id = p_customer_id;

  v_today_date := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
  v_is_active := v_current.customer_id IS NOT NULL
                 AND v_current.expiration_date IS NOT NULL
                 AND v_current.expiration_date::date >= v_today_date;
  v_same_type := v_current.customer_id IS NOT NULL
                 AND v_current.membership_type = p_membership_type;
  v_is_daily := p_membership_type = 'MEMBERSHIP_TYPE_DAILY';
  v_is_vip := p_membership_type = 'MEMBERSHIP_TYPE_VIP';
  v_is_type_change := v_is_active AND NOT v_same_type;
  v_can_update_current := v_is_active
                          AND NOT v_is_daily
                          AND NOT v_is_vip
                          AND v_current.current_payment_id IS NOT NULL;

  RAISE NOTICE 'State: active=%, same_type=%, daily=%, vip=%, type_change=%, can_update=%, current_payment_id=%',
    v_is_active, v_same_type, v_is_daily, v_is_vip, v_is_type_change, v_can_update_current, v_current.current_payment_id;

  INSERT INTO public.customer_membership (
    customer_id,
    membership_type,
    last_payment_date,
    expiration_date,
    renewal_date
  )
  VALUES (
    p_customer_id,
    p_membership_type,
    CASE WHEN p_is_paid THEN p_start_date ELSE v_current.last_payment_date END,
    CASE WHEN p_is_paid THEN p_end_date   ELSE v_current.expiration_date  END,
    now()
  )
  ON CONFLICT (customer_id)
  DO UPDATE SET
    membership_type   = EXCLUDED.membership_type,
    last_payment_date = EXCLUDED.last_payment_date,
    expiration_date   = EXCLUDED.expiration_date,
    renewal_date      = now()
  RETURNING id INTO v_membership_id;

  IF p_is_paid AND NOT v_is_vip THEN
    IF p_amount IS NULL OR p_amount <= 0 THEN
      RETURN json_build_object(
        'success', false, 'error_code', 'INVALID_AMOUNT',
        'message', 'El monto del pago debe ser mayor a 0', 'operation', 'validate'
      );
    END IF;

    IF p_payment_type IS NULL OR p_payment_type = '' THEN
      RETURN json_build_object(
        'success', false, 'error_code', 'MISSING_PAYMENT_METHOD',
        'message', 'El método de pago es requerido', 'operation', 'validate'
      );
    END IF;

    IF v_can_update_current THEN
      RAISE NOTICE 'UPDATE payment (paid path) id=%', v_current.current_payment_id;

      UPDATE public.membership_payments
      SET membership_type   = p_membership_type,
          amount            = p_amount,
          gross_amount      = v_gross,
          discount_amount   = v_discount,
          discount_rule_id  = p_discount_rule_id,
          discount_note     = p_discount_note,
          payment_date      = p_start_date,
          payment_method    = p_payment_type
      WHERE id = v_current.current_payment_id;
    ELSE
      RAISE NOTICE 'INSERT new payment (paid path)';

      INSERT INTO public.membership_payments (
        customer_id, membership_type, amount, gross_amount, discount_amount,
        discount_rule_id, discount_note, payment_date, payment_method
      )
      VALUES (
        p_customer_id, p_membership_type, p_amount, v_gross, v_discount,
        p_discount_rule_id, p_discount_note, p_start_date, p_payment_type
      )
      RETURNING id INTO v_new_payment_id;

      UPDATE public.customer_membership
      SET current_payment_id = v_new_payment_id
      WHERE customer_id = p_customer_id;
    END IF;

  ELSIF v_is_type_change AND v_can_update_current THEN
    SELECT amount INTO v_new_type_amount
    FROM public.types_memberships
    WHERE type = p_membership_type;

    RAISE NOTICE 'UPDATE payment (type-change-only path) id=%, new_amount=%',
      v_current.current_payment_id, v_new_type_amount;

    -- Cambio de tipo sin nuevo pago: recalcula bruto acorde al nuevo tipo,
    -- sin descuento (el cliente elige ese path deliberadamente).
    UPDATE public.membership_payments
    SET membership_type  = p_membership_type,
        amount           = COALESCE(v_new_type_amount, amount),
        gross_amount     = COALESCE(v_new_type_amount, gross_amount),
        discount_amount  = 0,
        discount_rule_id = NULL,
        discount_note    = NULL
    WHERE id = v_current.current_payment_id;
  END IF;

  IF v_is_type_change AND NOT v_is_daily AND NOT v_is_vip
     AND p_type_change_action = 'refund'
     AND p_adjustment_amount IS NOT NULL AND p_adjustment_amount > 0
  THEN
    RAISE NOTICE 'Registering refund expense: amount=%', p_adjustment_amount;

    INSERT INTO public.expenses (
      description, amount, category, expense_date, notes
    )
    VALUES (
      'Reintegro a ' || v_customer_first_name || ' ' || v_customer_last_name,
      p_adjustment_amount,
      'REFUNDS',
      now(),
      'Cambio de tipo de membresía: ' || v_current.membership_type || ' → ' || p_membership_type
    );
  END IF;

  IF v_is_type_change AND NOT v_is_daily AND NOT v_is_vip
     AND p_type_change_action = 'charge_diff'
     AND p_adjustment_amount IS NOT NULL AND p_adjustment_amount > 0
  THEN
    IF p_payment_type IS NULL OR p_payment_type = '' THEN
      RETURN json_build_object(
        'success', false, 'error_code', 'MISSING_PAYMENT_METHOD',
        'message', 'El método de pago es requerido para registrar la diferencia',
        'operation', 'validate'
      );
    END IF;

    RAISE NOTICE 'Registering charge diff: amount=%', p_adjustment_amount;

    -- Diferencia por upgrade: pago independiente, sin descuento.
    -- gross_amount = amount para satisfacer el CHECK amount_matches.
    INSERT INTO public.membership_payments (
      customer_id, membership_type, amount, gross_amount, discount_amount,
      payment_date, payment_method, notes
    )
    VALUES (
      p_customer_id,
      p_membership_type,
      p_adjustment_amount,
      p_adjustment_amount,
      0,
      COALESCE(p_start_date, now()),
      p_payment_type,
      'Diferencia por upgrade: ' || v_current.membership_type || ' → ' || p_membership_type
    );
  END IF;

  IF p_register_assistance THEN
    v_today_start := date_trunc('day', now() AT TIME ZONE 'America/Argentina/Buenos_Aires')
                     AT TIME ZONE 'America/Argentina/Buenos_Aires';
    v_today_end   := v_today_start + interval '1 day';

    SELECT COUNT(*)
    INTO v_existing_assistance_count
    FROM public.assistance
    WHERE customer_id = p_customer_id
      AND assistance_date >= v_today_start
      AND assistance_date <  v_today_end;

    IF v_existing_assistance_count > 0 THEN
      RETURN json_build_object(
        'success', false, 'error_code', 'ASSISTANCE_ALREADY_EXISTS',
        'message', 'El cliente ya tiene asistencia registrada hoy',
        'operation', 'create_assistance'
      );
    END IF;

    INSERT INTO public.assistance (customer_id, assistance_date)
    VALUES (p_customer_id, now())
    RETURNING id INTO v_assistance_id;

    UPDATE public.customers
    SET assistance_count = assistance_count + 1
    WHERE id = p_customer_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'operation', 'updated',
    'message', CASE
      WHEN p_is_paid AND p_register_assistance THEN 'Membresía actualizada, pago registrado y asistencia creada correctamente'
      WHEN p_is_paid                            THEN 'Membresía actualizada y pago registrado correctamente'
      WHEN p_register_assistance                THEN 'Membresía actualizada y asistencia creada correctamente'
      ELSE                                           'Membresía actualizada correctamente'
    END,
    'data', json_build_object(
      'membership_id',  v_membership_id,
      'assistance_id',  v_assistance_id,
      'new_payment_id', v_new_payment_id
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_detail = PG_EXCEPTION_DETAIL;
    RAISE WARNING 'Exception: SQLSTATE=%, SQLERRM=%, DETAIL=%', SQLSTATE, SQLERRM, v_error_detail;
    RETURN json_build_object(
      'success', false, 'error_code', 'UNEXPECTED_ERROR',
      'message', 'Error inesperado: ' || SQLERRM,
      'sqlstate', SQLSTATE, 'detail', v_error_detail,
      'operation', 'execute'
    );
END;
$function$;
