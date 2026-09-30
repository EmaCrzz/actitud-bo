-- =============================================================================
-- Migration ADITIVA — se aplica ANTES del release
-- Fase 11 (Gastos): medio de pago del gasto
-- =============================================================================
-- Contexto: "Brecha B1" y decisión #8 del plan v2 (docs/v2/PLAN.md). La sección
-- Gastos del rediseño muestra tres KPIs —Total de gastos / Efectivo /
-- Transferencias— y un filtro "Método", y el formulario pide "Forma de pago".
-- Nada de eso se puede sostener: `expenses` guarda descripción, monto,
-- categoría y fecha, y no sabe cómo se pagó.
--
-- POR QUÉ NULLABLE Y SIN BACKFILL
-- -------------------------------
-- Son dos razones independientes, y cualquiera de las dos alcanza.
--
-- 1) No sabemos cómo se pagaron los gastos que ya están cargados. Son 29,
--    entre 2026-07-10 y 2026-09-25 (medido en prod el 2026-09-29), así que no
--    hay un histórico grande que valga la pena adivinar. Y adivinar saldría
--    caro justo donde más pesa: los tres alquileres suman $1.200.000 y los
--    tres sueldos $399.000 — los montos más grandes son los que menos se
--    pagan en efectivo. Quedan en NULL y la UI los muestra como
--    "Sin especificar", que es la verdad.
--
-- 2) **`expenses` tiene un escritor que no es la UI.** El RPC
--    `upsert_customer_membership_with_payment` inserta una fila de categoría
--    `REFUNDS` cuando un cambio de plan genera un reintegro, y no recibe ni
--    puede deducir el medio de pago. Con NOT NULL esa inserción fallaría;
--    con NOT NULL DEFAULT 'PAYMENT_CASH' cada reintegro futuro quedaría
--    etiquetado como efectivo sin que nadie lo haya decidido. Nullable deja
--    ese camino intacto y honesto.
--
-- ES ENTERAMENTE ADITIVA
-- ----------------------
-- Una columna nullable, sin default. v1 no la conoce: sus formularios siguen
-- escribiendo las mismas cuatro columnas y sus listados siguen leyendo lo
-- mismo. Se puede aplicar a producción antes del deploy de código, sin
-- coordinación.
-- =============================================================================

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS payment_method character varying;

COMMENT ON COLUMN public.expenses.payment_method IS
  'Cómo se pagó el gasto. NULL = sin especificar, que es el estado de los '
  'gastos previos a la Fase 11 y el de los reintegros que inserta el RPC '
  'upsert_customer_membership_with_payment, que no conoce el medio de pago. '
  'Los KPIs Efectivo/Transferencias sólo suman las filas que lo tienen, así '
  'que Total de gastos puede ser mayor que la suma de los otros dos.';

-- El CHECK va aparte de la columna para poder recrearlo si alguna vez se suma
-- un medio de pago, sin tocar la definición de la columna. Los valores son los
-- mismos literales que usa `membership_payments.payment_method` y que el
-- código expone en `PaymentTypeArray` (src/membership/consts.ts): un solo
-- vocabulario de medios de pago para los dos lados del balance.
ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_payment_method_check;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('PAYMENT_CASH', 'PAYMENT_TRANSFER'));

-- Los KPIs filtran por medio de pago dentro de un rango de fechas, que es el
-- acceso que introduce esta fase. El índice parcial deja afuera las filas sin
-- especificar, que son las que nunca se filtran por este campo.
CREATE INDEX IF NOT EXISTS idx_expenses_payment_method
  ON public.expenses(payment_method)
  WHERE payment_method IS NOT NULL;
