-- =============================================================================
-- Migration: RPC public.upsert_customer_membership_with_payment
-- =============================================================================
-- Función usada por src/customer/api/client.ts (upsertCustomerMembership)
-- al actualizar la membresía de un cliente.
--
-- Estaba creada manualmente en DEV pero nunca se llevó a PROD, por eso
-- el módulo de actualización de membresía tiraba PGRST202 en producción
-- (schema divergence — el mismo patrón que veníamos arreglando con
-- profile/user_roles y las policies de types_memberships).
--
-- Definición extraída literalmente de DEV via pg_get_functiondef.
--
-- Idempotente: CREATE OR REPLACE FUNCTION reemplaza si ya existe.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.upsert_customer_membership_with_payment(
  p_customer_id uuid,
  p_membership_type character varying,
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone,
  p_is_paid boolean,
  p_payment_type character varying,
  p_amount real,
  p_register_assistance boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_membership_id uuid;
  v_assistance_id uuid;
  v_today_start timestamp with time zone;
  v_today_end timestamp with time zone;
  v_existing_assistance_count int;
  v_error_detail text;
BEGIN
  -- Log function call for debugging
  RAISE NOTICE 'Function called with customer_id: %, membership_type: %, is_paid: %', p_customer_id, p_membership_type, p_is_paid;

  -- Validate required parameters
  IF p_customer_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error_code', 'MISSING_CUSTOMER_ID',
      'message', 'El ID del cliente es requerido',
      'operation', 'validate'
    );
  END IF;

  IF p_membership_type IS NULL OR p_membership_type = '' THEN
    RETURN json_build_object(
      'success', false,
      'error_code', 'MISSING_MEMBERSHIP_TYPE',
      'message', 'El tipo de membresía es requerido',
      'operation', 'validate'
    );
  END IF;

  -- Validate customer exists
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = p_customer_id) THEN
    RETURN json_build_object(
      'success', false,
      'error_code', 'CUSTOMER_NOT_FOUND',
      'message', 'Cliente no encontrado',
      'operation', 'validate'
    );
  END IF;

  -- Validate membership type exists
  IF NOT EXISTS (SELECT 1 FROM public.types_memberships WHERE type = p_membership_type) THEN
    RETURN json_build_object(
      'success', false,
      'error_code', 'INVALID_MEMBERSHIP_TYPE',
      'message', 'Tipo de membresía no válido',
      'operation', 'validate'
    );
  END IF;

  -- Upsert customer_membership
  RAISE NOTICE 'About to upsert membership for customer: %', p_customer_id;

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
    CASE WHEN p_is_paid THEN p_start_date ELSE NULL END,
    CASE WHEN p_is_paid THEN p_end_date ELSE NULL END,
    now()
  )
  ON CONFLICT (customer_id)
  DO UPDATE SET
    membership_type = EXCLUDED.membership_type,
    last_payment_date = EXCLUDED.last_payment_date,
    expiration_date = EXCLUDED.expiration_date,
    renewal_date = now()
  RETURNING id INTO v_membership_id;

  RAISE NOTICE 'Membership upserted with id: %', v_membership_id;

  -- Handle payment registration
  IF p_is_paid THEN
    -- For VIP memberships, no payment validation or registration needed
    IF p_membership_type = 'MEMBERSHIP_TYPE_VIP' THEN
      RAISE NOTICE 'VIP membership - skipping payment registration';
    ELSE
      -- For non-VIP memberships, validate amount
      IF p_amount IS NULL OR p_amount <= 0 THEN
        RETURN json_build_object(
          'success', false,
          'error_code', 'INVALID_AMOUNT',
          'message', 'El monto del pago debe ser mayor a 0',
          'operation', 'validate'
        );
      END IF;

      -- Insert payment record
      RAISE NOTICE 'About to insert payment: amount=%, payment_date=%', p_amount, p_start_date;

      INSERT INTO public.membership_payments (
        customer_id,
        membership_type,
        amount,
        payment_date,
        payment_method
      )
      VALUES (
        p_customer_id,
        p_membership_type,
        p_amount,
        p_start_date,
        COALESCE(p_payment_type, 'efectivo')
      );

      RAISE NOTICE 'Payment inserted successfully';
    END IF;
  END IF;

  -- Register assistance if requested (not applicable for VIP)
  IF p_register_assistance AND p_membership_type != 'MEMBERSHIP_TYPE_VIP' THEN
    -- Get today's date range (America/La_Paz timezone)
    v_today_start := date_trunc('day', now() AT TIME ZONE 'America/La_Paz');
    v_today_end   := v_today_start + interval '1 day';

    -- Check if customer already has assistance today
    SELECT COUNT(*)
    INTO v_existing_assistance_count
    FROM public.assistance
    WHERE customer_id = p_customer_id
      AND assistance_date >= v_today_start
      AND assistance_date <  v_today_end;

    IF v_existing_assistance_count > 0 THEN
      RETURN json_build_object(
        'success', false,
        'error_code', 'ASSISTANCE_ALREADY_EXISTS',
        'message', 'El cliente ya tiene asistencia registrada hoy',
        'operation', 'create_assistance'
      );
    END IF;

    -- Insert assistance record
    INSERT INTO public.assistance (
      customer_id,
      assistance_date
    )
    VALUES (
      p_customer_id,
      now()
    )
    RETURNING id INTO v_assistance_id;

    -- Update customer assistance count
    UPDATE public.customers
    SET assistance_count = assistance_count + 1
    WHERE id = p_customer_id;
  END IF;

  -- Return success response
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
      'membership_id', v_membership_id,
      'assistance_id', v_assistance_id
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_detail = PG_EXCEPTION_DETAIL;
    RAISE WARNING 'Exception occurred: SQLSTATE=%, SQLERRM=%, DETAIL=%', SQLSTATE, SQLERRM, v_error_detail;
    RETURN json_build_object(
      'success', false,
      'error_code', 'UNEXPECTED_ERROR',
      'message', 'Error inesperado: ' || SQLERRM,
      'sqlstate', SQLSTATE,
      'detail', v_error_detail,
      'operation', 'execute'
    );
END;
$function$;
