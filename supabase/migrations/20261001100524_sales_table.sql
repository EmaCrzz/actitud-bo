-- =============================================================================
-- Migration ADITIVA — se aplica ANTES del release
-- Fase 12 (Ventas): ventas de producto
-- =============================================================================
-- Contexto: "Brecha A1" y decisión #5 del plan v2 (docs/v2/PLAN.md). ADR
-- 20261001100524_v2-seccion-ventas.md.
--
-- QUÉ ES UNA VENTA ACÁ
-- --------------------
-- La sección Ventas del rediseño lista **todo lo que se cobra**: cuotas de
-- membresía y productos (remeras, suplementos, artículos sueltos). Esta tabla
-- guarda **sólo los productos**. Las cuotas siguen viviendo en
-- `membership_payments`, y la sección une las dos al leer.
--
-- Cada peso cobrado vive en una sola tabla. Es lo que impide que Ventas o el
-- Balance de la Fase 13 cuenten dos veces la misma plata: si una cuota se
-- copiara acá también, cualquier suma de "ingresos" tendría que acordarse de
-- excluirla, y la que no se acuerde inflaría el mes sin ningún error visible.
--
-- POR QUÉ ES TAN CHICA
-- --------------------
-- Las tres respuestas del negocio (Ema, 2026-10-01) achicaron la propuesta
-- original de tres tablas (`products` / `sales` / `sale_items`) a una:
--
--   - **Sin stock.** El gimnasio no lleva inventario de nada.
--   - **Sin catálogo.** El producto se tipea libre en cada venta
--     ("Remera Hombre Talle L"). No hay tabla `products`.
--   - **Un producto por venta.** El formulario del diseño tiene un solo campo
--     de detalle y un solo precio, y la tabla una sola fila por venta. No hay
--     `sale_items`.
--
-- ES ENTERAMENTE ADITIVA
-- ----------------------
-- Una tabla nueva que v1 no conoce ni lee. Se puede aplicar a producción antes
-- del deploy de código, sin coordinación.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULL = venta a alguien que no es cliente.
  --
  -- **NO ACTION, igual que `membership_payments.customer_id`.** Borrar un
  -- cliente no puede borrar el registro de que esa plata entró: es la trampa
  -- que la Fase 10 encontró en `customer_membership`, cuya FK era CASCADE y
  -- borrar un plan borraba las membresías de todos sus clientes.
  customer_id uuid REFERENCES public.customers(id),

  -- "Datos de referencia" del formulario: a quién se le vendió cuando no es
  -- cliente. Opcional a propósito — a quien compra un agua no se le pide el
  -- nombre. Ver el CHECK de abajo.
  buyer_name varchar,

  -- "Detalle de la venta". El producto, tipeado libre.
  description varchar NOT NULL CHECK (btrim(description) <> ''),

  -- `real`, igual que `expenses.amount` y `membership_payments.amount`: el
  -- Balance suma los tres y conviene que sean del mismo tipo. `> 0` por el
  -- mismo criterio que esas dos tablas.
  amount real NOT NULL CHECK (amount > 0),

  -- NOT NULL, a diferencia de `expenses.payment_method`. Allá la columna es
  -- nullable porque había 29 gastos históricos sin el dato y un RPC que
  -- inserta reintegros sin conocerlo. Acá no hay ni histórico ni otro
  -- escritor: toda venta nace desde el formulario, que lo pide. Mismos
  -- literales que `PaymentTypeArray` (src/membership/consts.ts).
  payment_method varchar NOT NULL
    CHECK (payment_method IN ('PAYMENT_CASH', 'PAYMENT_TRANSFER')),

  -- La fecha contable de la venta, **canonicalizada a medianoche AR** por el
  -- server (mismo criterio que `expense_date`, ADR 20260709153000).
  --
  -- **Sin DEFAULT a propósito.** Un `DEFAULT now()` haría que un escritor que
  -- se olvide de mandarla guarde la hora real en vez de la medianoche AR, y
  -- la fila se vería bien en pantalla mientras queda distinta de todas las
  -- demás. Mejor que el insert falle.
  sale_date timestamptz NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- El nombre de quien compra sale de **un solo lugar**: del cliente si lo
  -- hay, de `buyer_name` si no. Con los dos cargados, el listado tendría que
  -- elegir cuál mostrar, y un cliente renombrado dejaría a la venta diciendo
  -- otra cosa que su ficha.
  CONSTRAINT sales_single_buyer_check CHECK (customer_id IS NULL OR buyer_name IS NULL)
);

COMMENT ON TABLE public.sales IS
  'Ventas de producto (Fase 12). Las cuotas de membresía NO van acá: viven en '
  'membership_payments, y la sección Ventas une las dos al leer. Cada peso '
  'cobrado vive en una sola tabla.';

-- El listado filtra por rango de fechas, que es el único acceso de la sección.
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON public.sales(sale_date);

-- Para la FK: sin índice, borrar un cliente recorre la tabla entera para
-- verificar que no tenga ventas.
CREATE INDEX IF NOT EXISTS idx_sales_customer_id
  ON public.sales(customer_id)
  WHERE customer_id IS NOT NULL;

-- updated_at se mantiene solo, igual que `types_memberships.last_update`
-- (migración 20260928110544): que lo escriba cada caller es garantizar que
-- alguno se lo olvide.
CREATE OR REPLACE FUNCTION public.touch_sales_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_touch_updated_at ON public.sales;

CREATE TRIGGER sales_touch_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_sales_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: admin-only en las cuatro operaciones
-- -----------------------------------------------------------------------------
-- Mismo patrón que `expenses` y `membership_payments`
-- (20260702120000_finances_admin_only_rls). La sección une ventas con cuotas,
-- y las cuotas ya son admin-only: abrir sólo esta tabla no le daría a un
-- no-admin una sección usable, sólo una con la mitad de los números.
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read sales"   ON public.sales;
DROP POLICY IF EXISTS "Admins can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Admins can update sales" ON public.sales;
DROP POLICY IF EXISTS "Admins can delete sales" ON public.sales;

CREATE POLICY "Admins can read sales"
  ON public.sales FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert sales"
  ON public.sales FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update sales"
  ON public.sales FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete sales"
  ON public.sales FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));
