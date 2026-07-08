-- =============================================================================
-- Migration: renombra la categoría 'reintegros' (español) a 'REFUNDS' (inglés)
--            en expenses y actualiza el RPC para insertar el nuevo valor.
-- =============================================================================
-- La convención real de las categorías de expenses vive en
-- src/expenses/consts.ts (inglés en UPPERCASE: SERVICES, RENT, TAXES, etc).
-- La categoría de reintegros por cambio de tipo de membresía se agregó
-- originalmente en español lowercase ('reintegros'), rompiendo la
-- convención y quedando sin traducción i18n.
--
-- Cambios:
--   1) UPDATE de filas existentes en expenses de 'reintegros' → 'REFUNDS'.
--   2) CREATE OR REPLACE del RPC para que INSERT use 'REFUNDS'.
-- =============================================================================

UPDATE public.expenses
SET category = 'REFUNDS'
WHERE category = 'reintegros';

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
  p_adjustment_amount real DEFAULT NULL
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
BEGIN
  RAISE NOTICE 'Function called: customer=%, type=%, is_paid=%, type_change_action=%',
    p_customer_id, p_membership_type, p_is_paid, p_type_change_action;

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

    IF v_can_update_current THEN
      RAISE NOTICE 'UPDATE payment (paid path) id=%', v_current.current_payment_id;

      UPDATE public.membership_payments
      SET membership_type = p_membership_type,
          amount          = p_amount,
          payment_date    = p_start_date,
          payment_method  = COALESCE(p_payment_type, 'efectivo')
      WHERE id = v_current.current_payment_id;
    ELSE
      RAISE NOTICE 'INSERT new payment (paid path)';

      INSERT INTO public.membership_payments (
        customer_id, membership_type, amount, payment_date, payment_method
      )
      VALUES (
        p_customer_id, p_membership_type, p_amount, p_start_date,
        COALESCE(p_payment_type, 'efectivo')
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

    UPDATE public.membership_payments
    SET membership_type = p_membership_type,
        amount          = COALESCE(v_new_type_amount, amount)
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
    RAISE NOTICE 'Registering charge diff: amount=%', p_adjustment_amount;

    INSERT INTO public.membership_payments (
      customer_id, membership_type, amount, payment_date, payment_method, notes
    )
    VALUES (
      p_customer_id,
      p_membership_type,
      p_adjustment_amount,
      COALESCE(p_start_date, now()),
      COALESCE(p_payment_type, 'efectivo'),
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
