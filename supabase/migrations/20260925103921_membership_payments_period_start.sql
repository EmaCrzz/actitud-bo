-- =============================================================================
-- membership_payments: separar "cuándo entró la plata" de "qué período paga"
-- =============================================================================
-- Issue #59. Ver el ADR 20260925103921 para el detalle completo.
--
-- `upsert_customer_membership_with_payment` escribía `payment_date =
-- p_start_date`, que es la fecha que el operador elige en el datepicker de
-- inicio del período. Un solo valor alimentando dos conceptos distintos, que es
-- el mismo defecto que `customer_membership.last_payment_date` tenía antes de
-- que la Fase 7 le agregara `start_date`.
--
-- Consecuencias medidas contra PRODUCCIÓN el 2026-09-25 (291 pagos):
--
--   * 73 filas tienen la fecha desfasada (promedio 7,2 días, máximo 46).
--   * 8 de ellas caen en un mes contable distinto del que entró la plata.
--   * "Últimos pagos" de /incomes ordena por payment_date, así que cuatro
--     cobros del 21 de septiembre quedaron en los puestos 91 a 94 de 287.
--
-- La buena noticia: **el dato nunca se perdió**. `created_at` es NOT NULL
-- DEFAULT now() desde siempre y guarda el momento real del cobro. El backfill
-- es una copia entre columnas existentes, no una reconstrucción.
--
-- Verificado antes de escribir esta migración, sobre prod:
--
--   * `created_at` se reparte entre las 7 y las 21 hs AR, con picos a las 10 y
--     a las 20 — actividad real de mostrador. Ninguna fila fuera de horario.
--   * 218 de 291 pagos (75%) ya tienen las dos fechas en el mismo día: se
--     cobraron en el acto. Eso confirma por su cuenta que `created_at` es el
--     momento del cobro y no un artefacto.
--   * 49 días distintos con carga, máximo 1 fila por segundo. Ningún restore ni
--     backfill masivo que invalidaría el criterio.
--
-- CRITERIO DE NEGOCIO (decidido con Ema el 2026-09-23, ejecutado el 2026-09-25):
-- **el mes contable es cuándo entró la plata — criterio de caja.** Es lo que
-- cuadra contra la caja y el banco, lo que hace comparable el mes contra Gastos
-- (que ya van por fecha de gasto), y lo que evita que un mes ya cerrado siga
-- cambiando porque alguien pagó tarde.
--
-- EFECTO VISIBLE EN LOS REPORTES (prod, antes → después):
--
--   2026-06   $78.000    →  $0           (sus 4 pagos se cargaron en julio)
--   2026-07   $1.623.850 →  $1.660.850   (+$37.000)
--   2026-08   $1.893.400 →  $1.934.400   (+$41.000)
--   2026-09   $2.167.500 →  $2.167.500   (sin cambio)
--
-- Junio y julio están cerrados y la plata no se pierde: se reatribuye al mes en
-- que se registró. Junio tenía 4 pagos contra 89 de julio — la app recién
-- arrancaba, y esos 4 son carga retroactiva del backlog.
--
-- REVERSIBLE: el valor viejo de `payment_date` queda guardado en `period_start`
-- antes de pisarse. Volver atrás es `UPDATE membership_payments SET
-- payment_date = period_start`, no un restore.
--
-- RETROCOMPATIBLE: la columna es nueva y nadie la lee todavía; el código viejo
-- sigue leyendo `payment_date`, que después de esta migración dice la verdad en
-- vez de mentir. Se aplica ANTES del deploy del código.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. La columna
-- -----------------------------------------------------------------------------

ALTER TABLE public.membership_payments
  ADD COLUMN IF NOT EXISTS period_start timestamp with time zone;

-- -----------------------------------------------------------------------------
-- 2. Backfill — en este orden, que importa
-- -----------------------------------------------------------------------------

-- Primero preservar: lo que payment_date venía guardando ES el inicio del
-- período. Esta copia es la que hace reversible el paso siguiente.
UPDATE public.membership_payments
SET period_start = payment_date
WHERE period_start IS NULL;

-- Y recién ahora corregir payment_date con el momento real del cobro.
--
-- Toca las 291 filas, no las 73 que cambian de día: hasta hoy payment_date era
-- medianoche AR canonicalizada (invariante que puso la migración
-- 20260729144614) y created_at trae la hora real, así que **todas** difieren al
-- instante. En 218 sólo cambia la hora del día; en 73 cambia el día calendario
-- y en 8 el mes contable.
--
-- Esta migración abandona el invariante de medianoche AR para payment_date, a
-- propósito: ya no representa un día de calendario elegido en un datepicker
-- sino un instante en que ocurrió algo. Ninguna UI muestra la hora
-- (`formatDate` y `relativeDateLabel` resuelven el día en AR), así que el
-- efecto visible es sólo en el orden: "Últimos pagos" ordena por payment_date
-- DESC y hasta ahora los cobros del mismo día empataban en medianoche y salían
-- en orden arbitrario. Ahora salen en el orden real en que se cobraron.
--
-- El invariante de medianoche AR sigue vigente para period_start, que sí es una
-- fecha de datepicker — y lo hereda del backfill de arriba.
UPDATE public.membership_payments
SET payment_date = created_at
WHERE payment_date IS DISTINCT FROM created_at;

-- -----------------------------------------------------------------------------
-- 3. Garantía
-- -----------------------------------------------------------------------------

-- NOT NULL porque una fila sin período no se puede contar en el ciclo de cobro
-- y desaparecería del tablero sin que nada falle. El RPC no puede escribir NULL
-- acá: usa COALESCE(p_start_date, v_paid_at) en los dos INSERT.
ALTER TABLE public.membership_payments
  ALTER COLUMN period_start SET NOT NULL;

COMMENT ON COLUMN public.membership_payments.period_start IS
  'Inicio del período de membresía que este pago cubre — la fecha que el '
  'operador elige en el datepicker. NO es cuándo se cobró: para eso está '
  'payment_date. Lo leen el ciclo de cobro y la lista de socios pendientes, que '
  'preguntan "¿pagó la cuota de este mes?". Issue #59.';

COMMENT ON COLUMN public.membership_payments.payment_date IS
  'Momento en que entró la plata. Es la fecha contable: agrupan por acá el '
  'cobrado del mes, los breakdowns, los descuentos, la serie de 6 meses, el '
  'balance y los ingresos del día. Hasta el 2026-09-25 guardaba el inicio del '
  'período, que ahora vive en period_start. Issue #59.';

-- No se crea índice: la tabla tiene 291 filas y payment_date tampoco lo tiene.
-- Cuando alguna de las dos lo necesite, van juntas.

-- -----------------------------------------------------------------------------
-- 4. El RPC deja de confundir las dos fechas
-- -----------------------------------------------------------------------------
-- CREATE OR REPLACE y no DROP + CREATE porque la firma no cambia: mismos 16
-- parámetros. No puede aparecer un overload nuevo.
--
-- Cambios contra la versión de 20260922125530, y nada más:
--
--   a) v_paid_at := now() — un único instante para todo el cobro, en vez de
--      llamar now() tres veces y arriesgar que caigan a los dos lados de la
--      medianoche AR.
--   b) INSERT: payment_date = v_paid_at, period_start = p_start_date.
--   c) UPDATE (corrección del mismo período): escribe period_start y **no toca
--      payment_date**. La plata entró cuando se registró la fila original;
--      corregirle el monto tres días después no la mueve de mes. El doble
--      submit —el caso que motivó el camino idempotente— ocurre en el mismo
--      instante, así que ahí tampoco hay diferencia.
--   d) next_receipt_number(v_paid_at) en vez de (p_start_date). El comprobante
--      se emite hoy: una renovación hecha el 28/12 para un período de enero
--      estaba consumiendo numeración del año siguiente.
-- -----------------------------------------------------------------------------

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
  v_period_start        timestamp with time zone;
  v_same_period         boolean;
  v_new_type_amount     real;
  v_customer_first_name text;
  v_customer_last_name  text;
  v_error_detail        text;
  v_gross               real;
  v_discount            real;
  v_surcharge           real;
  v_receipt_number      text;
  v_effective_end_date  timestamp with time zone;
  -- Momento del cobro, con nombre. `now()` en Postgres es
  -- transaction_timestamp(): ya devolvía el mismo instante en las siete
  -- llamadas que la función tenía sueltas, así que esto **no cambia ningún
  -- comportamiento**. Lo que cambia es que ahora se lee qué significa ese
  -- instante — es la fecha contable del cobro — en vez de aparecer siete veces
  -- como un detalle de implementación.
  v_paid_at             timestamp with time zone := now();
  -- Inicio del período que se está pagando. COALESCE porque el camino
  -- charge_diff puede llegar sin p_start_date, y period_start es NOT NULL.
  v_new_period_start    timestamp with time zone;
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

  v_new_period_start := COALESCE(p_start_date, v_paid_at);

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

  v_today_date := (v_paid_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
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

  -- ¿El cobro que llega es del MISMO período que ya está pago, o de uno nuevo?
  --
  -- El criterio original (migración 20260707113341) era "membresía vigente =
  -- mismo período", y eso convertía una renovación anticipada en una
  -- corrección: pagar octubre el 28 de septiembre pisaba el cobro de
  -- septiembre y lo dejaba sin registro. Ver el ADR 20260922125530.
  --
  -- El inicio del período vigente sale de start_date con fallback a
  -- last_payment_date — la misma resolución que getMembershipPeriodStart() en
  -- TypeScript. Medido contra producción: de 96 membresías activas con pago
  -- vigente, 10 tienen start_date, 86 caen al fallback y **ninguna** se queda
  -- sin las dos, así que nadie pierde la idempotencia por este criterio.
  --
  -- Sigue leyendo customer_membership y no el period_start nuevo de
  -- membership_payments: la pregunta es por el período VIGENTE de la membresía,
  -- que es lo que customer_membership representa. Un pago sin membresía activa
  -- no define período vigente.
  --
  -- Se compara por día calendario AR y no por instante: el form manda
  -- medianoche AR canonicalizada, pero una corrección hecha desde otro camino
  -- podría traer otra hora del mismo día y sigue siendo el mismo período.
  v_period_start := COALESCE(v_current.start_date, v_current.last_payment_date);
  v_same_period := p_start_date IS NOT NULL
                   AND v_period_start IS NOT NULL
                   AND (p_start_date   AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
                     = (v_period_start AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;

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

  RAISE NOTICE 'State: active=%, same_type=%, daily=%, vip=%, type_change=%, can_update=%, same_period=%, current_payment_id=%, effective_end=%',
    v_is_active, v_same_type, v_is_daily, v_is_vip, v_is_type_change, v_can_update_current, v_same_period, v_current.current_payment_id, v_effective_end_date;

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
    v_paid_at
  )
  ON CONFLICT (customer_id)
  DO UPDATE SET
    membership_type   = EXCLUDED.membership_type,
    last_payment_date = EXCLUDED.last_payment_date,
    expiration_date   = EXCLUDED.expiration_date,
    start_date        = EXCLUDED.start_date,
    renewal_date      = v_paid_at
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

    -- Sólo se pisa el pago vigente si el cobro es del MISMO período. Un cobro
    -- de un período nuevo es una transacción nueva aunque la membresía siga
    -- vigente, y merece su propia fila y su propio comprobante.
    IF v_can_update_current AND v_same_period THEN
      RAISE NOTICE 'UPDATE payment (paid path, mismo periodo) id=%', v_current.current_payment_id;

      -- Este es el camino idempotente: re-cobrar el mismo período pisa el pago
      -- vigente en vez de duplicarlo. El comprobante se asigna sólo si la fila
      -- no tenía uno (histórico, o pago previo a la migración 20260921101140):
      -- reemitir el mismo cobro no debe consumir un número nuevo ni cambiarle
      -- el número a un comprobante que el cliente ya recibió.
      --
      -- **payment_date no se toca a propósito.** Esta rama es una corrección de
      -- un cobro que ya ocurrió: la plata entró cuando se creó la fila, y
      -- moverla a hoy sacaría de su mes un ingreso ya contabilizado sólo
      -- porque alguien corrigió un monto. period_start sí se reescribe, pero
      -- v_same_period garantiza que es el mismo día calendario.
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
                                public.next_receipt_number(v_paid_at)
                              ),
          period_start      = v_new_period_start,
          payment_method    = p_payment_type
      WHERE id = v_current.current_payment_id
      RETURNING receipt_number INTO v_receipt_number;
    ELSE
      RAISE NOTICE 'INSERT new payment (paid path)';

      INSERT INTO public.membership_payments (
        customer_id, membership_type, amount, gross_amount, discount_amount,
        discount_rule_id, discount_note, surcharge_amount, surcharge_note,
        receipt_number, payment_date, period_start, payment_method
      )
      VALUES (
        p_customer_id, p_membership_type, p_amount, v_gross, v_discount,
        p_discount_rule_id, p_discount_note, v_surcharge, p_surcharge_note,
        public.next_receipt_number(v_paid_at), v_paid_at, v_new_period_start,
        p_payment_type
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
    -- descuento ni recargo (el cliente elige ese path deliberadamente). No
    -- toca ninguna de las dos fechas — no hubo cobro nuevo ni cambió el
    -- período, sólo el plan.
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
      v_paid_at,
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
    -- propio comprobante porque es un cobro propio, con su propio monto. Esta
    -- plata entra hoy, así que payment_date = v_paid_at igual que el camino
    -- normal; el período que cubre es el que está vigente.
    INSERT INTO public.membership_payments (
      customer_id, membership_type, amount, gross_amount, discount_amount,
      surcharge_amount, receipt_number, payment_date, period_start,
      payment_method, notes
    )
    VALUES (
      p_customer_id,
      p_membership_type,
      p_adjustment_amount,
      p_adjustment_amount,
      0,
      0,
      public.next_receipt_number(v_paid_at),
      v_paid_at,
      v_new_period_start,
      p_payment_type,
      'Diferencia por upgrade: ' || v_current.membership_type || ' → ' || p_membership_type
    );
  END IF;

  IF p_register_assistance THEN
    v_today_start := date_trunc('day', v_paid_at AT TIME ZONE 'America/Argentina/Buenos_Aires')
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
    VALUES (p_customer_id, v_paid_at)
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
