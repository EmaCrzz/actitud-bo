-- =============================================================================
-- Migration A (ADITIVA — se aplica ANTES del release)
-- B12: customer_membership.start_date + capacidad de escribirlo desde el alta
-- =============================================================================
-- Contexto: "Brecha B12" del plan v2 (docs/v2/PLAN.md). El alta de cliente pide
-- "Fecha de inicio" además de "Fecha de vencimiento", pero la tabla sólo tiene
-- expiration_date. Hoy el inicio se guarda **pisando last_payment_date**
-- (src/customer/api/client.ts manda el start_date del form como
-- p_last_payment_date), una columna que además leen accounting
-- (src/accounting/api/incomes.ts) y la barra de progreso del perfil v2.
--
-- Dos datos distintos en una sola columna: cuándo arranca el período y cuándo
-- se cobró. Coinciden casi siempre, pero no son lo mismo, y el día que se
-- edite un pago retroactivo dejan de coincidir en silencio.
--
-- ESTA MIGRACIÓN ES ENTERAMENTE ADITIVA
-- -------------------------------------
-- Agrega una columna nullable, agrega parámetros con DEFAULT NULL, y agrega
-- una escritura de columna. Ningún caller existente cambia de comportamiento:
-- las llamadas de 9 parámetros al RPC del alta siguen resolviendo igual, y el
-- RPC de pago sigue escribiendo last_payment_date exactamente como antes.
-- Se puede aplicar a producción antes del deploy de código, sin coordinación.
--
-- SIN BACKFILL, A PROPÓSITO
-- -------------------------
-- Hay 539 clientes en producción sin ningún registro de cuándo empezó su
-- período actual. Copiar last_payment_date a start_date parece inocente pero
-- fabricaría un dato que nadie midió: para un cliente cuyo pago se registró
-- tarde, el "inicio" quedaría después del inicio real. Se deja NULL y el
-- código resuelve el histórico con el fallback explícito de
-- getMembershipPeriodStart() (src/membership/period.ts), que es honesto sobre
-- qué está leyendo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. La columna
-- -----------------------------------------------------------------------------

ALTER TABLE public.customer_membership
  ADD COLUMN IF NOT EXISTS start_date timestamp with time zone;

COMMENT ON COLUMN public.customer_membership.start_date IS
  'Inicio del período de membresía vigente. Nullable: las filas anteriores a '
  'la migración 20260918120000 no lo tienen y se resuelven con el fallback de '
  'getMembershipPeriodStart() (start_date ?? last_payment_date). No confundir '
  'con last_payment_date, que es cuándo se cobró, no cuándo arranca el período.';

-- -----------------------------------------------------------------------------
-- 2. RPC del alta: acepta birth_date, notes y start_date
-- -----------------------------------------------------------------------------
--
-- Por qué DROP + CREATE y no CREATE OR REPLACE: Postgres no permite agregar
-- parámetros con CREATE OR REPLACE — hacerlo crea un **overload nuevo**, y
-- este esquema ya tiene un caso de dos overloads conviviendo
-- (upsert_customer_membership_with_payment) que costó una auditoría entera
-- entender. Una sola función con parámetros opcionales al final es
-- retrocompatible con las llamadas de 9 parámetros que hace el código actual.
--
-- Qué se agrega, y por qué recién ahora: birth_date y notes existen como
-- columnas desde la migración 20260916150000 (fase 6b, para que el perfil las
-- **muestre**), pero este RPC es el único camino de escritura del alta y no
-- las aceptaba. Resultado medido en prod el 2026-09-18: 0 filas con birth_date
-- y 0 con notes. El formulario de la fase 7 es su primer escritor real.
--
-- El cuerpo es el de la función anterior, verbatim, más las tres escrituras
-- nuevas. No se aprovecha para limpiar la validación duplicada de
-- membership_type (aparece en el bloque de creación y otra vez abajo): cambiar
-- comportamiento no relacionado en la misma migración es cómo se pierden los
-- bisects.

DROP FUNCTION IF EXISTS public.upsert_customer_with_membership(
  uuid, character varying, character varying, character varying,
  character varying, character varying, character varying,
  timestamp with time zone, timestamp with time zone
);

CREATE FUNCTION public.upsert_customer_with_membership(
  p_customer_id uuid DEFAULT NULL::uuid,
  p_first_name character varying DEFAULT NULL::character varying,
  p_last_name character varying DEFAULT NULL::character varying,
  p_person_id character varying DEFAULT NULL::character varying,
  p_phone character varying DEFAULT NULL::character varying,
  p_email character varying DEFAULT NULL::character varying,
  p_membership_type character varying DEFAULT NULL::character varying,
  p_last_payment_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_expiration_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_birth_date date DEFAULT NULL::date,
  p_notes text DEFAULT NULL::text,
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  updated_customer record;
  updated_membership record;
  existing_customer record;
  result json;
  is_creating boolean := false;
  calculated_expiration_date timestamp with time zone;
BEGIN
  -- Determinar si estamos creando o actualizando
  is_creating := (p_customer_id IS NULL);

  -- Calcular fecha de expiración si se proporciona fecha de pago pero no expiración
  IF p_last_payment_date IS NOT NULL AND p_expiration_date IS NULL THEN
    calculated_expiration_date := p_last_payment_date + INTERVAL '1 month';
  ELSE
    calculated_expiration_date := p_expiration_date;
  END IF;

  IF is_creating THEN
    -- CREAR NUEVO CLIENTE
    -- Validar campos requeridos para creación
    IF p_first_name IS NULL OR p_last_name IS NULL OR p_person_id IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'error_code', 'MISSING_REQUIRED_FIELDS',
        'message', 'Para crear un cliente son requeridos: first_name, last_name y person_id',
        'operation', 'create',
        'data', json_build_object(
          'missing_fields', ARRAY[
            CASE WHEN p_first_name IS NULL THEN 'first_name' END,
            CASE WHEN p_last_name IS NULL THEN 'last_name' END,
            CASE WHEN p_person_id IS NULL THEN 'person_id' END
          ]::text[] - ARRAY[NULL]::text[]
        )
      );
    END IF;

    -- Verificar que person_id no exista
    IF EXISTS (SELECT 1 FROM public.customers WHERE person_id = p_person_id) THEN
      -- Obtener datos del cliente existente
      SELECT * INTO existing_customer
      FROM public.customers
      WHERE person_id = p_person_id;

      RETURN json_build_object(
        'success', false,
        'error_code', 'PERSON_ID_ALREADY_EXISTS',
        'message', 'Ya existe un cliente con este número de identificación',
        'operation', 'create',
        'data', json_build_object(
          'existing_customer', row_to_json(existing_customer),
          'conflicting_person_id', p_person_id
        )
      );
    END IF;

    IF p_membership_type IS NOT NULL THEN
      -- Verificar que el tipo de membresía existe
      IF NOT EXISTS (SELECT 1 FROM public.types_memberships WHERE type = p_membership_type) THEN
        RETURN json_build_object(
          'success', false,
          'error_code', 'INVALID_MEMBERSHIP_TYPE',
          'message', 'Tipo de membresía no válido: ' || p_membership_type,
          'operation', CASE WHEN is_creating THEN 'create' ELSE 'update' END,
          'data', json_build_object(
            'invalid_membership_type', p_membership_type,
            'available_types', (
              SELECT json_agg(type)
              FROM public.types_memberships
            )
          )
        );
      END IF;
    END IF;

    -- Insertar nuevo cliente
    INSERT INTO public.customers (
      first_name, last_name, person_id, phone, email, birth_date, notes
    )
    VALUES (
      p_first_name, p_last_name, p_person_id, p_phone, p_email, p_birth_date, p_notes
    )
    RETURNING * INTO updated_customer;

  ELSE
    -- ACTUALIZAR CLIENTE EXISTENTE
    --
    -- COALESCE en cada campo: un NULL significa "el caller no mandó este dato",
    -- no "borralo". Es el contrato que ya tenía la función y del que depende el
    -- form de v1, que no manda birth_date ni notes.
    UPDATE public.customers
    SET
      first_name = COALESCE(p_first_name, first_name),
      last_name = COALESCE(p_last_name, last_name),
      person_id = COALESCE(p_person_id, person_id),
      phone = COALESCE(p_phone, phone),
      email = COALESCE(p_email, email),
      birth_date = COALESCE(p_birth_date, birth_date),
      notes = COALESCE(p_notes, notes)
    WHERE id = p_customer_id
    RETURNING * INTO updated_customer;

    -- Si no se encontró el cliente, lanzar error
    IF updated_customer IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'error_code', 'CUSTOMER_NOT_FOUND',
        'message', 'Cliente no encontrado con ID: ' || p_customer_id,
        'operation', 'update',
        'data', json_build_object(
          'customer_id', p_customer_id
        )
      );
    END IF;
  END IF;

  -- Manejar membresía si se proporciona tipo
  IF p_membership_type IS NOT NULL THEN
    -- Verificar que el tipo de membresía existe
    IF NOT EXISTS (SELECT 1 FROM public.types_memberships WHERE type = p_membership_type) THEN
      RETURN json_build_object(
        'success', false,
        'error_code', 'INVALID_MEMBERSHIP_TYPE',
        'message', 'Tipo de membresía no válido: ' || p_membership_type,
        'operation', CASE WHEN is_creating THEN 'create' ELSE 'update' END,
        'data', json_build_object(
          'invalid_membership_type', p_membership_type,
          'available_types', (
            SELECT json_agg(type)
            FROM public.types_memberships
          )
        )
      );
    END IF;

    -- UPSERT de membresía (insertar o actualizar la única membresía del cliente)
    INSERT INTO public.customer_membership (
      customer_id,
      membership_type,
      last_payment_date,
      expiration_date,
      start_date
    )
    VALUES (
      updated_customer.id,
      p_membership_type,
      p_last_payment_date,
      calculated_expiration_date,
      p_start_date
    )
    ON CONFLICT (customer_id)
    DO UPDATE SET
      membership_type = EXCLUDED.membership_type,
      last_payment_date = COALESCE(EXCLUDED.last_payment_date, customer_membership.last_payment_date),
      expiration_date = COALESCE(EXCLUDED.expiration_date, customer_membership.expiration_date),
      start_date = COALESCE(EXCLUDED.start_date, customer_membership.start_date)
    RETURNING * INTO updated_membership;

  ELSE
    -- Si no se proporciona tipo de membresía, obtener la actual
    SELECT * INTO updated_membership
    FROM public.customer_membership
    WHERE customer_id = updated_customer.id;
  END IF;

  -- Construir resultado JSON
  SELECT json_build_object(
    'customer', row_to_json(updated_customer),
    'membership', row_to_json(updated_membership),
    'success', true,
    'operation', CASE WHEN is_creating THEN 'created' ELSE 'updated' END,
    'message', CASE
      WHEN is_creating THEN 'Cliente y membresía creados exitosamente'
      ELSE 'Cliente y membresía actualizados exitosamente'
    END,
    'membership_active', CASE
      WHEN updated_membership.expiration_date IS NOT NULL
      THEN updated_membership.expiration_date > now()
      ELSE false
    END
  ) INTO result;

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error_code', 'UNEXPECTED_ERROR',
      'message', SQLERRM,
      'operation', CASE WHEN is_creating THEN 'create' ELSE 'update' END,
      'data', json_build_object(
        'sql_error', SQLERRM,
        'sql_state', SQLSTATE
      )
    );
END;
$function$;

-- DROP FUNCTION descarta los privilegios junto con la función, y CREATE la deja
-- con el ACL default. Se reponen explícitamente los mismos que tenía la versión
-- de 9 parámetros (medidos en prod el 2026-09-18) para que el cliente del
-- browser, que ejecuta como `authenticated`, la siga pudiendo invocar. Sin
-- esto el alta falla con "permission denied for function" en runtime, no en la
-- migración — el peor momento para enterarse.
GRANT EXECUTE ON FUNCTION public.upsert_customer_with_membership(
  uuid, character varying, character varying, character varying,
  character varying, character varying, character varying,
  timestamp with time zone, timestamp with time zone,
  date, text, timestamp with time zone
) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. RPC de pago (14 params): también escribe start_date
-- -----------------------------------------------------------------------------
--
-- Acá va CREATE OR REPLACE, no DROP + CREATE: la firma no cambia, y REPLACE
-- preserva el ACL existente, así que no hace falta reponer GRANTs.
--
-- ADEMÁS: restaura la canonicalización de expiration_date para DAILY, que este
-- overload perdió. Ver el bloque "REGRESIÓN DE DAILY" más abajo.
--
-- Sin esto, start_date quedaría congelado en la fecha de alta para siempre:
-- el alta lo escribiría una vez y ninguna renovación lo movería. Peor que no
-- tener la columna — getMembershipPeriodStart() prefiere start_date, así que
-- devolvería un dato viejo donde hoy el fallback devuelve last_payment_date,
-- que al menos se actualiza. Sería una regresión silenciosa en la barra de
-- progreso del perfil.
--
-- El cambio es de dos líneas y espeja exactamente el tratamiento que la
-- función ya le da a last_payment_date: se escribe sólo cuando hay pago, y se
-- preserva el valor anterior cuando no lo hay. Ningún otro comportamiento
-- cambia.

CREATE OR REPLACE FUNCTION public.upsert_customer_membership_with_payment(
  p_customer_id uuid,
  p_membership_type character varying,
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone,
  p_is_paid boolean,
  p_payment_type character varying,
  p_amount real,
  p_register_assistance boolean DEFAULT false,
  p_type_change_action character varying DEFAULT NULL::character varying,
  p_adjustment_amount real DEFAULT NULL::real,
  p_gross_amount real DEFAULT NULL::real,
  p_discount_amount real DEFAULT 0,
  p_discount_rule_id uuid DEFAULT NULL::uuid,
  p_discount_note text DEFAULT NULL::text
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
  v_effective_end_date  timestamp with time zone;
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

  -- ---------------------------------------------------------------------------
  -- REGRESIÓN DE DAILY: canonicalizar expiration_date al fin del día AR
  -- ---------------------------------------------------------------------------
  -- Esta lógica existía en el overload de 10 parámetros desde la migración
  -- 20260709000000 y **se perdió** al crear el overload de 14 en
  -- 20260722120000 (grupos familiares y descuentos): la variable `v_is_daily`
  -- sobrevivió, pero el cálculo de `v_effective_end_date` no. Nadie lo notó
  -- porque el overload viejo siguió atendiendo al alta de cliente.
  --
  -- Por qué importa. El pase diario se cobra y vence el mismo día, así que el
  -- form manda p_end_date = hoy, que canonicalizado es **hoy 00:00 AR**. Casi
  -- todos los consumidores comparan por día calendario o con `>= inicio de
  -- hoy`, y con esos la fila funciona bien. Pero `get_membership_stats` filtra
  -- con `cm.expiration_date > NOW()` — mayor **estricto**, contra el instante
  -- real. A las 10 de la mañana, `hoy 00:00 > hoy 10:00` es falso: **el pase
  -- diario desaparece de las métricas de membresías el mismo día en que se
  -- vendió**, aunque el pago sí quedó registrado. Plata cobrada que no figura
  -- en el conteo de activas.
  --
  -- Verificado contra producción el 2026-09-18: las 8 membresías DAILY creadas
  -- desde el 2026-07-29 tienen expiration_date a las 00:00 AR y ninguna habría
  -- sido contada por las stats en su propio día. Las dos anteriores
  -- (23:59:59.999, del overload viejo) sí. El corte coincide exactamente con la
  -- adopción del overload de 14 parámetros.
  --
  -- No se backfillean esas 8 filas: son pases de un día ya vencidos hace
  -- semanas, y las stats de meses pasados se calculan por `created_at`, no por
  -- expiración. Corregirlas no cambiaría ningún número que alguien vaya a mirar.
  --
  -- Se ignora p_end_date a propósito para DAILY: un pase diario vence hoy por
  -- definición, no por lo que haya mandado el caller.
  IF v_is_daily AND p_is_paid THEN
    v_effective_end_date := ((v_today_date + interval '1 day')::timestamp
                             AT TIME ZONE 'America/Argentina/Buenos_Aires')
                            - interval '1 millisecond';
  ELSE
    v_effective_end_date := p_end_date;
  END IF;

  RAISE NOTICE 'State: active=%, same_type=%, daily=%, vip=%, type_change=%, can_update=%, current_payment_id=%, effective_end=%',
    v_is_active, v_same_type, v_is_daily, v_is_vip, v_is_type_change, v_can_update_current, v_current.current_payment_id, v_effective_end_date;

  -- start_date espeja a last_payment_date: se escribe con el mismo valor
  -- (p_start_date es el inicio del período que se está pagando) y se preserva
  -- el anterior cuando la llamada no registra pago. Ver migración
  -- 20260918120000 y el helper getMembershipPeriodStart().
  INSERT INTO public.customer_membership (
    customer_id,
    membership_type,
    last_payment_date,
    expiration_date,
    start_date,
    renewal_date
  )
  VALUES (
    p_customer_id,
    p_membership_type,
    CASE WHEN p_is_paid THEN p_start_date        ELSE v_current.last_payment_date END,
    CASE WHEN p_is_paid THEN v_effective_end_date ELSE v_current.expiration_date  END,
    CASE WHEN p_is_paid THEN p_start_date        ELSE v_current.start_date       END,
    now()
  )
  ON CONFLICT (customer_id)
  DO UPDATE SET
    membership_type   = EXCLUDED.membership_type,
    last_payment_date = EXCLUDED.last_payment_date,
    expiration_date   = EXCLUDED.expiration_date,
    start_date        = EXCLUDED.start_date,
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
