-- =============================================================================
-- Migration: payment_method obligatorio en membership_payments
-- =============================================================================
-- Contexto: "Defecto C" del plan v2 (docs/v2/PLAN.md, sección "Brechas de base
-- de datos"). La columna tenía un DEFAULT que su propio CHECK rechaza:
--
--   payment_method varchar DEFAULT 'efectivo'
--     CHECK (payment_method IN ('PAYMENT_CASH', 'PAYMENT_TRANSFER'))
--
-- Verificado contra producción el 2026-09-17: el DEFAULT y el CHECK siguen tal
-- cual. Cualquier INSERT que **omita** la columna toma 'efectivo', viola el
-- CHECK y falla. El camino de falla existe hoy y no es teórico:
--
--   - `CreateMembershipPaymentData.payment_method` es opcional (`?: string`)
--     en src/accounting/types.ts.
--   - POST /api/accounting/payments castea el body crudo a ese tipo **sin
--     validación runtime** y lo inserta tal cual. Un cast de TypeScript no
--     valida nada en runtime.
--
-- No se rompió todavía porque los call sites actuales siempre mandan el método
-- (282 pagos en prod: 195 PAYMENT_TRANSFER + 87 PAYMENT_CASH, 0 nulos).
--
-- POR QUÉ NO ALCANZA CON `DROP DEFAULT`
-- -------------------------------------
-- Sacar sólo el default **empeoraría** las cosas. Un CHECK pasa cuando su
-- expresión no es FALSE, y `NULL = ANY(ARRAY[...])` devuelve NULL, no FALSE:
--
--   SELECT NULL::text = ANY(ARRAY['PAYMENT_CASH','PAYMENT_TRANSFER']);  -- NULL
--
-- O sea que un INSERT que omita la columna pasaría de **fallar ruidosamente**
-- (hoy) a **insertar NULL en silencio**. Un pago sin método registrado no
-- rompe nada visible pero descuadra el desglose "Efectivo / Transferencias"
-- del dashboard de ingresos y del Balance — exactamente el perfil de falla
-- silenciosa que este proyecto ya sufrió con las fechas (ADR 20260709153000).
--
-- Por eso la migración hace las dos cosas: quita el default inválido y exige
-- el valor. La combinación mantiene el error ruidoso, que es lo correcto: no
-- existe un método de pago por defecto sensato — cómo pagó el cliente es un
-- dato del negocio, no algo que la base pueda suponer.
--
-- Seguridad de deploy: SET NOT NULL exige que no haya nulos. Verificado en dev
-- y en prod: 0 filas con payment_method NULL en ambos. La migración no
-- reescribe la tabla (NOT NULL sobre una columna sin nulos sólo valida) y no
-- rompe ningún INSERT existente, porque todos los call sites ya mandan el
-- método. Se puede aplicar antes o después del release.
-- =============================================================================

-- 0. Guarda de precondición.
--
--    `SET NOT NULL` exige que no haya nulos, y esta migración se escribió
--    midiendo dev y prod el 2026-09-17 (0 nulos en ambos). Pero entre esa
--    medición y el `db:push-prod` — que es un paso **manual**, desacoplado del
--    deploy de código — prod sigue operando: un POST a /api/accounting/payments
--    con `payment_method: null` explícito pasa el CHECK (es justamente el
--    agujero que esta migración cierra) y dejaría una fila nula.
--
--    Sin esta guarda, ese caso aborta el push con un error críptico de Postgres
--    en medio de un deploy. Con ella, falla antes de tocar nada y dice qué pasó
--    y qué hacer. Se resuelve a mano porque **no hay backfill correcto**:
--    suponer el medio de pago de un cobro real es inventar contabilidad.
DO $$
DECLARE
  v_nulos integer;
BEGIN
  SELECT count(*) INTO v_nulos
  FROM public.membership_payments
  WHERE payment_method IS NULL;

  IF v_nulos > 0 THEN
    RAISE EXCEPTION
      'No se puede aplicar: hay % pago(s) con payment_method NULL. '
      'Revisalos y asignales PAYMENT_CASH o PAYMENT_TRANSFER segun el '
      'comprobante antes de reintentar; no hay backfill automatico correcto. '
      'Query: SELECT id, customer_id, amount, payment_date FROM '
      'membership_payments WHERE payment_method IS NULL;',
      v_nulos;
  END IF;
END $$;

ALTER TABLE public.membership_payments
  ALTER COLUMN payment_method DROP DEFAULT;

ALTER TABLE public.membership_payments
  ALTER COLUMN payment_method SET NOT NULL;

COMMENT ON COLUMN public.membership_payments.payment_method IS
  'Medio de pago: PAYMENT_CASH | PAYMENT_TRANSFER. Obligatorio y sin default '
  'a propósito — no hay un medio de pago por defecto sensato, y un NULL acá '
  'descuadraría en silencio el desglose Efectivo/Transferencias de ingresos y '
  'del Balance. Ver migración 20260917120000.';
