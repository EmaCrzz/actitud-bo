-- =============================================================================
-- Migration: realinear payment_date de pagos que quedaron en midnight UTC
--            al equivalente midnight AR (+3h).
-- =============================================================================
-- Contexto:
--   El form de membresía enviaba las fechas del datepicker ("YYYY-MM-DD") como
--   strings sin timezone al RPC. Postgres las interpreta como midnight UTC,
--   lo cual en zona Argentina (UTC-3) representa "día anterior 21:00".
--
--   Consecuencia: cuando el operador cargaba un pago con fecha "1 de julio",
--   quedaba registrado como `2026-07-01 00:00:00+00` = `2026-06-30 21:00 AR`.
--   El dashboard de ingresos filtra por rango del mes en zona AR y ubicaba
--   ese pago en junio en vez de julio.
--
--   Al momento de esta migración: 91 pagos históricos afectados desde el
--   4 de junio de 2026 (primer caso conocido). Se detectó al testear el
--   nuevo tipo MEMBERSHIP_TYPE_2_DAYS: 2 pagos hechos con fecha "1 de julio"
--   no aparecían en el dashboard de julio.
--
-- Fix:
--   Sumar 3 horas a `payment_date` de todos los pagos con hora exactamente
--   `00:00:00 UTC`. Los mueve de "día X-1 21:00 AR" a "día X 00:00 AR",
--   ubicándolos en el mes calendario que el operador esperaba.
--
--   El fix causal (que el form envíe midnight AR y no midnight UTC) va en
--   el mismo PR, en src/customer/api/client.ts.
--
-- Seguridad del filtro:
--   Los pagos legítimos hechos "en vivo" por operadores humanos nunca
--   aterrizan a las 00:00:00 UTC exactas — ese timestamp es exclusivo de
--   inputs de datepicker que se guardan como fecha sin hora. Filtrar por
--   `time = '00:00:00'` en UTC captura solo los pagos afectados por el bug.
-- =============================================================================

UPDATE public.membership_payments
SET payment_date = payment_date + interval '3 hours'
WHERE (payment_date AT TIME ZONE 'UTC')::time = '00:00:00'::time;
