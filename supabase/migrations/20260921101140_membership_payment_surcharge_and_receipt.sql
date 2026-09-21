-- =============================================================================
-- Recargo explícito y número de comprobante en membership_payments
-- (ADITIVA — se aplica ANTES del release, default del proyecto)
-- =============================================================================
-- Contexto: Fase 8 del plan v2 (docs/v2/PLAN.md) — flow de renovación de
-- membresía con comprobante. Dos brechas que cierra:
--
--   1. El recargo por mora no tiene dónde guardarse. Hoy se cobra eligiendo
--      `charge_mode = 'surcharge'`, que escribe `types_memberships.
--      amount_surcharge` —el precio total con recargo— en `gross_amount`. La
--      fila resultante es indistinguible de un plan que simplemente cuesta
--      más: se pierde cuánto fue recargo, y por lo tanto el comprobante del
--      rediseño (que tiene `Recargo` como fila propia) no lo puede mostrar sin
--      recalcularlo contra el precio de hoy, que para un pago viejo da mal.
--
--      Decisión de producto (Ema, 2026-09-21): el recargo se **sugiere** con
--      el monto configurado cuando se cumplen las condiciones, y el operador
--      puede editarlo o no aplicarlo. Eso obliga a guardar el monto cobrado,
--      no a derivarlo de una regla.
--
--   2. El comprobante no tiene identificador (brecha B3 del plan). Un
--      comprobante que el cliente recibe por WhatsApp y después menciona en un
--      reclamo no se puede buscar.
--
-- POR QUÉ ES ADITIVA
-- ------------------
-- `surcharge_amount` nace NOT NULL DEFAULT 0, `surcharge_note` y
-- `receipt_number` nacen nullable, y los dos parámetros nuevos del RPC tienen
-- DEFAULT. El código hoy en producción sigue resolviendo igual: escribe
-- surcharge 0 y el CHECK nuevo, con surcharge = 0, es literalmente el CHECK
-- viejo. Se puede aplicar a prod antes del deploy, sin coordinación.
--
-- El único cambio de comportamiento para un caller viejo es que sus pagos
-- nuevos pasan a recibir `receipt_number`. Es aditivo: nadie lo lee todavía.
--
-- SIN BACKFILL, A PROPÓSITO
-- -------------------------
-- Los pagos históricos quedan con `receipt_number` NULL y `surcharge_amount`
-- 0. Numerar retroactivamente inventaría un orden de emisión que nunca
-- existió, y repartir el recargo de un pago viejo entre base y recargo exige
-- adivinar qué precio tenía el plan ese día — el dato que justamente no
-- guardamos. Un comprobante viejo se reimprime sin número, que es la verdad.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Columnas nuevas
-- -----------------------------------------------------------------------------

ALTER TABLE public.membership_payments
  ADD COLUMN IF NOT EXISTS surcharge_amount real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS surcharge_note text,
  ADD COLUMN IF NOT EXISTS receipt_number text;

COMMENT ON COLUMN public.membership_payments.surcharge_amount IS
  'Recargo por mora efectivamente cobrado, en pesos. 0 = sin recargo. Es el '
  'monto del recargo, NO el precio total con recargo: el total va en amount. '
  'Se sugiere desde types_memberships.amount_surcharge - amount, pero el '
  'operador puede editarlo, así que esta columna es el dato y la resta sólo la '
  'sugerencia. Las filas anteriores a la migración 20260921101140 están en 0 '
  'incluso si cobraron recargo — ahí quedó embebido en gross_amount.';

COMMENT ON COLUMN public.membership_payments.surcharge_note IS
  'Justificación opcional del recargo, sobre todo cuando el operador lo edita '
  'por encima o por debajo del configurado. Opcional a propósito: la política '
  'de recargo es una sugerencia, no una obligación, así que exigir nota para '
  'desviarse convertiría la sugerencia en regla por la puerta de atrás. '
  'Compará con discount_note, que SÍ es obligatoria para descuentos sin regla '
  '(CHECK membership_payments_adhoc_requires_note) — un descuento sin '
  'justificación es plata que falta; un recargo sin nota es plata que sobra.';

COMMENT ON COLUMN public.membership_payments.receipt_number IS
  'Número de comprobante, formato YYYY-NNNNN con secuencia por año AR (ver '
  'next_receipt_number()). Nullable: los pagos anteriores a la migración '
  '20260921101140 no tienen número y no se backfillean.';

ALTER TABLE public.membership_payments
  DROP CONSTRAINT IF EXISTS membership_payments_surcharge_nonneg;
ALTER TABLE public.membership_payments
  ADD  CONSTRAINT membership_payments_surcharge_nonneg
       CHECK (surcharge_amount >= 0);

-- UNIQUE y no PRIMARY KEY porque conviven filas sin número (el histórico), y
-- en Postgres los NULL no colisionan entre sí en un índice único.
ALTER TABLE public.membership_payments
  DROP CONSTRAINT IF EXISTS membership_payments_receipt_number_unique;
ALTER TABLE public.membership_payments
  ADD  CONSTRAINT membership_payments_receipt_number_unique
       UNIQUE (receipt_number);

-- -----------------------------------------------------------------------------
-- 2. El CHECK de consistencia del monto, ahora con recargo
-- -----------------------------------------------------------------------------
-- El CHECK original (migración 20260722120000) era
--   amount = gross_amount - discount_amount
-- Con surcharge_amount en 0 —que es el default y lo que escribe todo el código
-- actual— la versión nueva es equivalente, así que ninguna fila existente ni
-- ninguna escritura vieja se rechaza. Verificado: 0 filas violan el CHECK
-- nuevo antes de aplicarlo (`amount <> gross_amount - discount_amount`).
--
-- Igualdad exacta sobre `real` (float4) es deliberado y no nuevo: el CHECK
-- viejo ya era así y nunca falló, porque los montos son pesos enteros y el RPC
-- calcula el neto con las mismas tres columnas que guarda. Si algún día
-- aparecen centavos, esto hay que pasarlo a numeric — no aflojarle la
-- tolerancia.
ALTER TABLE public.membership_payments
  DROP CONSTRAINT IF EXISTS membership_payments_amount_matches;
ALTER TABLE public.membership_payments
  ADD  CONSTRAINT membership_payments_amount_matches
       CHECK (amount = gross_amount + surcharge_amount - discount_amount);

-- -----------------------------------------------------------------------------
-- 3. Secuencia de comprobantes por año
-- -----------------------------------------------------------------------------
-- Por qué una tabla contador y no un `CREATE SEQUENCE`: la numeración
-- reinicia cada año, y una secuencia de Postgres no reinicia sola — haría
-- falta una secuencia por año creada a mano cada 1 de enero, o un cron. Una
-- fila por año con UPSERT atómico no tiene mantenimiento.
--
-- Por qué el año sale de una fecha y no de now(): un pago retroactivo cargado
-- en enero para diciembre pertenece al ejercicio de diciembre, que es como lo
-- agrupa accounting (por payment_date). El comprobante sigue el mismo criterio.

CREATE TABLE IF NOT EXISTS public.receipt_counters (
  year        integer PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0 CHECK (last_number >= 0),
  updated_at  timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.receipt_counters IS
  'Contador de comprobantes por año calendario AR. Lo toca únicamente '
  'next_receipt_number(); no tiene policies de RLS a propósito, así que ningún '
  'rol de la API puede leerlo ni incrementarlo directamente.';

-- Sin policies: con RLS habilitada y cero policies, anon y authenticated no
-- pueden hacer nada con la tabla. Las funciones SECURITY DEFINER de abajo
-- corren como owner y no pasan por RLS, que es el único acceso que queremos.
ALTER TABLE public.receipt_counters ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.receipt_counters FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.next_receipt_number(
  p_date timestamp with time zone DEFAULT now()
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_year int;
  v_next int;
BEGIN
  v_year := EXTRACT(
    YEAR FROM (COALESCE(p_date, now()) AT TIME ZONE 'America/Argentina/Buenos_Aires')
  )::int;

  -- UPSERT atómico: el INSERT toma el lock de la fila del año y el DO UPDATE
  -- incrementa sobre el valor ya commiteado, así que dos cobros simultáneos no
  -- pueden sacar el mismo número. El UNIQUE de receipt_number es la red.
  INSERT INTO public.receipt_counters AS rc (year, last_number, updated_at)
  VALUES (v_year, 1, now())
  ON CONFLICT (year) DO UPDATE
    SET last_number = rc.last_number + 1,
        updated_at  = now()
  RETURNING rc.last_number INTO v_next;

  RETURN v_year::text || '-' || lpad(v_next::text, 5, '0');
END;
$function$;

COMMENT ON FUNCTION public.next_receipt_number(timestamp with time zone) IS
  'Devuelve el próximo número de comprobante del año de la fecha dada, formato '
  'YYYY-NNNNN. Sin EXECUTE para anon/authenticated: sólo la llaman otras '
  'funciones SECURITY DEFINER, y exponerla dejaría quemar numeración.';

REVOKE ALL ON FUNCTION public.next_receipt_number(timestamp with time zone) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.next_receipt_number(timestamp with time zone) FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. RPC de pago: dos parámetros nuevos y asignación de comprobante
-- -----------------------------------------------------------------------------
-- DROP + CREATE, no CREATE OR REPLACE: Postgres no permite agregar parámetros
-- con REPLACE, y hacerlo de todos modos crea un **overload nuevo**. Este
-- esquema ya pagó ese precio una vez — dos overloads de esta misma función
-- convivieron dos meses, uno con un bug de canonicalización de DAILY y otro
-- sin validación de método de pago, y una llamada de 10 argumentos matcheaba
-- los dos (PGRST203, alta de cliente rota desde el 2026-07-22). Ver
-- 20260918120100_drop_legacy_payment_rpc_overload.sql. Una sola función, con
-- los parámetros nuevos opcionales al final, sigue resolviendo las llamadas de
-- 14 argumentos que hace el código actual.
--
-- El DROP y el CREATE van en la misma transacción que el resto de la
-- migración, así que no hay ventana donde la función no exista.

DROP FUNCTION IF EXISTS public.upsert_customer_membership_with_payment(
  uuid, character varying, timestamp with time zone, timestamp with time zone,
  boolean, character varying, real, boolean, character varying, real, real,
  real, uuid, text
);

CREATE FUNCTION public.upsert_customer_membership_with_payment(
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
  p_discount_note text DEFAULT NULL::text,
  p_surcharge_amount real DEFAULT 0,
  p_surcharge_note text DEFAULT NULL::text
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
  v_surcharge           real;
  v_receipt_number      text;
  v_effective_end_date  timestamp with time zone;
BEGIN
  RAISE NOTICE 'Function called: customer=%, type=%, is_paid=%, type_change_action=%, discount=%, surcharge=%',
    p_customer_id, p_membership_type, p_is_paid, p_type_change_action, p_discount_amount, p_surcharge_amount;

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

  -- Normalización de bruto, descuento y recargo:
  --   * Si el caller no envía p_gross_amount, asumimos bruto = neto
  --     (compatibilidad con callers viejos, que no separan el desglose).
  --   * El recargo se clampea en 0: un recargo negativo es un descuento
  --     disfrazado, y los descuentos tienen su propio camino con regla y nota.
  --   * Si hay descuento > 0 sin regla ni nota → error amigable antes de que
  --     la base lance el CHECK 23514.
  v_discount  := COALESCE(p_discount_amount, 0);
  v_surcharge := GREATEST(COALESCE(p_surcharge_amount, 0), 0);
  v_gross     := COALESCE(p_gross_amount, p_amount);

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

  -- La consistencia del desglose se valida en cuanto hay descuento **o**
  -- recargo. Antes sólo se chequeaba con descuento, porque era la única parte
  -- que podía no cerrar. El error amigable importa: el CHECK de la tabla
  -- devuelve un 23514 que la UI no sabe explicar.
  IF (v_discount > 0 OR v_surcharge > 0)
     AND p_amount IS NOT NULL
     AND abs((v_gross + v_surcharge - v_discount) - p_amount) > 0.01
  THEN
    RETURN json_build_object(
      'success', false, 'error_code', 'AMOUNT_MATH_MISMATCH',
      'message', 'El monto neto no coincide con bruto + recargo - descuento',
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

  -- DAILY: expiration_date al fin del día AR, no a las 00:00.
  -- `get_membership_stats` filtra con `expiration_date > NOW()` (mayor
  -- estricto), así que un pase que vence a las 00:00 desaparece de las
  -- métricas el mismo día en que se vendió. Esta lógica se perdió una vez al
  -- duplicar la función para agregarle descuentos; el detalle completo está en
  -- 20260918120000_customer_membership_start_date.sql. Se ignora p_end_date a
  -- propósito: un pase diario vence hoy por definición.
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

      -- Este es el camino idempotente: re-cobrar el mismo período pisa el pago
      -- vigente en vez de duplicarlo. El comprobante se asigna sólo si la fila
      -- no tenía uno (histórico, o pago previo a esta migración): reemitir el
      -- mismo cobro no debe consumir un número nuevo ni cambiarle el número a
      -- un comprobante que el cliente ya recibió.
      UPDATE public.membership_payments
      SET membership_type   = p_membership_type,
          amount            = p_amount,
          gross_amount      = v_gross,
          discount_amount   = v_discount,
          discount_rule_id  = p_discount_rule_id,
          discount_note     = p_discount_note,
          surcharge_amount  = v_surcharge,
          surcharge_note    = p_surcharge_note,
          receipt_number    = COALESCE(
                                receipt_number,
                                public.next_receipt_number(p_start_date)
                              ),
          payment_date      = p_start_date,
          payment_method    = p_payment_type
      WHERE id = v_current.current_payment_id
      RETURNING receipt_number INTO v_receipt_number;
    ELSE
      RAISE NOTICE 'INSERT new payment (paid path)';

      INSERT INTO public.membership_payments (
        customer_id, membership_type, amount, gross_amount, discount_amount,
        discount_rule_id, discount_note, surcharge_amount, surcharge_note,
        receipt_number, payment_date, payment_method
      )
      VALUES (
        p_customer_id, p_membership_type, p_amount, v_gross, v_discount,
        p_discount_rule_id, p_discount_note, v_surcharge, p_surcharge_note,
        public.next_receipt_number(p_start_date), p_start_date, p_payment_type
      )
      RETURNING id, receipt_number INTO v_new_payment_id, v_receipt_number;

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

    -- Cambio de tipo sin nuevo pago: recalcula bruto acorde al nuevo tipo, sin
    -- descuento ni recargo (el cliente elige ese path deliberadamente).
    UPDATE public.membership_payments
    SET membership_type   = p_membership_type,
        amount            = COALESCE(v_new_type_amount, amount),
        gross_amount      = COALESCE(v_new_type_amount, gross_amount),
        discount_amount   = 0,
        discount_rule_id  = NULL,
        discount_note     = NULL,
        surcharge_amount  = 0,
        surcharge_note    = NULL
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

    -- Diferencia por upgrade: pago independiente, sin descuento ni recargo.
    -- gross_amount = amount para satisfacer el CHECK amount_matches. Lleva su
    -- propio comprobante porque es un cobro propio, con su propio monto.
    INSERT INTO public.membership_payments (
      customer_id, membership_type, amount, gross_amount, discount_amount,
      surcharge_amount, receipt_number, payment_date, payment_method, notes
    )
    VALUES (
      p_customer_id,
      p_membership_type,
      p_adjustment_amount,
      p_adjustment_amount,
      0,
      0,
      public.next_receipt_number(COALESCE(p_start_date, now())),
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
      'new_payment_id', v_new_payment_id,
      -- El comprobante viaja en la respuesta para que el flow de renovación lo
      -- pueda mostrar sin una segunda consulta — que además sería a
      -- membership_payments, que es admin-only por RLS.
      'receipt_number', v_receipt_number
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
