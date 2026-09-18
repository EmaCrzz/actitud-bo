-- =============================================================================
-- Migration B — elimina el overload legacy de 10 parámetros de
-- upsert_customer_membership_with_payment
-- =============================================================================
-- SE APLICA ANTES DEL RELEASE, junto con la migración A. No es destructiva:
-- repara. Ver "POR QUÉ ESTO NO ROMPE EL CÓDIGO VIEJO" más abajo — la primera
-- versión de este archivo decía lo contrario y estaba equivocada.
--
-- QUÉ PASA HOY EN PRODUCCIÓN
-- --------------------------
-- Conviven dos overloads de esta función: el legacy de 10 parámetros y el de
-- 14 que agregó los descuentos (migración 20260722120000). Los 4 parámetros
-- extra del segundo tienen DEFAULT, así que **una llamada con 10 argumentos
-- matchea a los dos** y PostgREST no puede elegir:
--
--   PGRST203: Could not choose the best candidate function between:
--     upsert_customer_membership_with_payment(... 10 args ...),
--     upsert_customer_membership_with_payment(... 14 args ...)
--
-- Verificado por HTTP contra el PostgREST real el 2026-09-18: el payload de 10
-- campos devuelve PGRST203; el de 14 entra a la función sin problema.
--
-- El único caller con 10 campos es el paso 2 del alta de cliente
-- (_upsertCustomer en src/customer/api/client.ts). O sea: **el alta de v1 con
-- "pagó" tildado viene fallando en producción desde el 2026-07-22**. El cliente
-- y la membresía se crean (paso 1, otra función, sin ambigüedad) y el pago no,
-- con el mensaje "Cliente creado, pero falló el registro del pago/asistencia".
--
-- Evidencia en los datos de prod, consistente con eso:
--   * De los 15 clientes creados desde el 22-07 que tienen algún pago, **cero**
--     lo tienen registrado junto al alta: todos llegaron después, por el form de
--     renovación, que manda los 14 params y funciona.
--   * Las 2 altas de pase DIARIO desde el 22-07 no tienen pago **ninguna**. Es
--     el caso más limpio: para DAILY el form de v1 fuerza payment='on' con un
--     input hidden, así que toda alta diaria pasa sí o sí por el camino roto.
--
-- El impacto económico fue chico sólo porque en la práctica el alta casi nunca
-- se usa con cobro (antes del 22-07, 1 de 118 clientes con pago lo tenía
-- registrado al momento del alta). No porque el bug fuera menor.
--
-- POR QUÉ ESTO NO ROMPE EL CÓDIGO VIEJO
-- -------------------------------------
-- Al quedar un solo candidato, PostgREST resuelve el payload de 10 campos
-- contra el overload de 14: los 4 que faltan toman su DEFAULT. Y los defaults
-- son los correctos para un pago sin descuento —
-- `v_gross := COALESCE(p_gross_amount, p_amount)` y `discount = 0`— así que se
-- satisface el CHECK `amount = gross_amount - discount_amount`.
--
-- Verificado en dev el 2026-09-18, aplicando esta migración y repitiendo la
-- llamada de 10 campos: `success=true`, y la fila queda
-- `amount=25000 gross=25000 desc=0 metodo=PAYMENT_CASH`.
--
-- O sea que esta migración **arregla el alta de v1 sin necesidad de deployar
-- código**, y el release que la acompaña simplemente deja de depender de la
-- resolución por defaults al mandar los 14 params explícitos.
--
-- Corolario sobre el orden: como el camino viejo hoy está 100% roto, aplicar
-- esta migración antes del release no puede empeorar nada — sólo puede mejorar.
-- Es lo contrario de lo que asumía la versión anterior de este comentario, que
-- daba por hecho que "el código en producción todavía la llama" significaba
-- "y la llamada funciona".
--
-- ROLLBACK
-- --------
-- Recrear el overload desde el historial de git (migración 20260709000000)
-- devolvería la ambigüedad y volvería a romper el alta. Si algo sale mal, el
-- camino es arreglar hacia adelante, no restaurar esta función.
-- =============================================================================

DROP FUNCTION IF EXISTS public.upsert_customer_membership_with_payment(
  uuid,                       -- p_customer_id
  character varying,          -- p_membership_type
  timestamp with time zone,   -- p_start_date
  timestamp with time zone,   -- p_end_date
  boolean,                    -- p_is_paid
  character varying,          -- p_payment_type
  real,                       -- p_amount
  boolean,                    -- p_register_assistance
  character varying,          -- p_type_change_action
  real                        -- p_adjustment_amount
);
