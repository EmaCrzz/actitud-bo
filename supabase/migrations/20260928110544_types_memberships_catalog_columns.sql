-- =============================================================================
-- Migration ADITIVA — se aplica ANTES del release
-- Fase 10 (Membresías): catálogo de planes editable desde la UI
-- =============================================================================
-- Contexto: "Brecha B6" y decisión #7 del plan v2 (docs/v2/PLAN.md). La sección
-- Membresías del rediseño lista los planes, edita sus precios, muestra su
-- frecuencia semanal y su estado, y **crea planes nuevos** ("Plan familiar 5
-- días" en la maqueta del 2026-09-28).
--
-- Hoy nada de eso se puede sostener: `types_memberships` sólo tiene el tipo y
-- los tres precios. El nombre visible sale de un diccionario i18n indexado por
-- la clave del tipo, el cupo semanal vive hardcodeado en `SLOTS_BY_TYPE`
-- (src/membership/consts.ts) y no hay forma de discontinuar un plan.
--
-- POR QUÉ EL CATÁLOGO SIGUE SIENDO HÍBRIDO
-- ----------------------------------------
-- Los 5 tipos actuales no son sólo nombres: VIP no se cobra y exige rol admin,
-- DAILY vence el mismo día y no tiene modalidades de cobro, y las tres cosas
-- están escritas en los RPCs comparando el string literal. Esas reglas se
-- quedan donde están. Lo que esta migración habilita es crear planes
-- **ordinarios** — mensuales, cobrables, con cupo semanal — que caen en la
-- rama por defecto de todo el código existente.
--
-- Por eso `name` es nullable: los 5 tipos del catálogo lo dejan en NULL y
-- siguen resolviendo por key i18n. Sólo los planes creados desde la UI lo
-- llenan. El resolver (src/membership/catalog.ts) prefiere la key y cae al
-- `name` de la DB, en ese orden.
--
-- ES ENTERAMENTE ADITIVA
-- ----------------------
-- Tres columnas nuevas (dos nullable, una con DEFAULT), un trigger, y dos
-- endurecimientos de permisos. Ningún caller existente cambia de
-- comportamiento: v1 no conoce estas columnas y sigue leyendo y escribiendo
-- exactamente lo mismo. Se puede aplicar a producción antes del deploy de
-- código, sin coordinación.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Las columnas
-- -----------------------------------------------------------------------------

ALTER TABLE public.types_memberships
  ADD COLUMN IF NOT EXISTS name         character varying,
  ADD COLUMN IF NOT EXISTS weekly_quota smallint,
  ADD COLUMN IF NOT EXISTS active       boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.types_memberships.name IS
  'Nombre visible del plan, sólo para los planes creados desde la UI. NULL en '
  'los 5 tipos del catálogo original (MEMBERSHIP_TYPE_*), que resuelven su '
  'etiqueta por key i18n. El resolver getMembershipLabel() prefiere la key y '
  'cae a esta columna.';

COMMENT ON COLUMN public.types_memberships.weekly_quota IS
  'Días por semana que habilita el plan. Reemplaza el mapa hardcodeado '
  'SLOTS_BY_TYPE de src/membership/consts.ts, que queda como fallback de los '
  '5 tipos originales. El VIP lleva 5 por la misma razón que lo llevaba ahí: '
  'acceso ilimitado dentro de la semana, y 5 es el tope de días hábiles.';

COMMENT ON COLUMN public.types_memberships.active IS
  'Un plan inactivo desaparece de los selects de alta y renovación, pero se '
  'sigue mostrando en los clientes y pagos que ya lo tienen. Es la única '
  'forma de discontinuar un plan: el DELETE está deshabilitado a nivel FK '
  '(ver bloque 5).';

-- El CHECK va aparte de la columna para poder recrearlo si alguna vez cambia
-- el rango, sin tocar la definición de la columna.
ALTER TABLE public.types_memberships
  DROP CONSTRAINT IF EXISTS types_memberships_weekly_quota_range;

ALTER TABLE public.types_memberships
  ADD CONSTRAINT types_memberships_weekly_quota_range
  CHECK (weekly_quota IS NULL OR (weekly_quota >= 1 AND weekly_quota <= 7));

-- -----------------------------------------------------------------------------
-- 2. Backfill del cupo semanal
-- -----------------------------------------------------------------------------
--
-- Los valores salen de SLOTS_BY_TYPE (src/membership/consts.ts), que es el
-- dato que la app viene usando. No se inventa nada: se mueve al lugar donde
-- debería haber estado.
--
-- Se deja NULL cualquier tipo que no esté en esta lista, si existiera alguno
-- en la DB que el código no conoce. El resolver lo trata como "sin cupo
-- definido", que es honesto, en vez de asumirle un número.

UPDATE public.types_memberships SET weekly_quota = 5 WHERE type = 'MEMBERSHIP_TYPE_VIP'    AND weekly_quota IS NULL;
UPDATE public.types_memberships SET weekly_quota = 5 WHERE type = 'MEMBERSHIP_TYPE_5_DAYS' AND weekly_quota IS NULL;
UPDATE public.types_memberships SET weekly_quota = 3 WHERE type = 'MEMBERSHIP_TYPE_3_DAYS' AND weekly_quota IS NULL;
UPDATE public.types_memberships SET weekly_quota = 2 WHERE type = 'MEMBERSHIP_TYPE_2_DAYS' AND weekly_quota IS NULL;
UPDATE public.types_memberships SET weekly_quota = 1 WHERE type = 'MEMBERSHIP_TYPE_DAILY'  AND weekly_quota IS NULL;

-- -----------------------------------------------------------------------------
-- 3. `last_update` pasa a actualizarse de verdad
-- -----------------------------------------------------------------------------
--
-- La columna es `DEFAULT now()`, que sólo dispara en el INSERT, y
-- `updateMembershipPrices` (src/membership/api/server.ts) nunca la escribe.
-- O sea que hoy guarda **la fecha de creación de la fila**, no la del último
-- cambio de precio — y tanto la tabla de v1 (src/membership/components/
-- amounts.tsx) como el panel de edición del rediseño la muestran rotulada
-- como "Última actualización".
--
-- Es un dato que se lee mal desde siempre y que nadie podía notar porque el
-- valor es plausible. Se arregla con un trigger en vez de pedirle a cada
-- caller que lo escriba: un caller nuevo que se olvide reintroduce el bug en
-- silencio.
--
-- No se backfillea: no hay registro de cuándo se cambió cada precio. Las filas
-- existentes siguen mostrando su fecha de creación hasta que alguien las
-- edite, momento en el que el valor pasa a ser correcto para siempre.

CREATE OR REPLACE FUNCTION public.touch_types_memberships_last_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_update := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.touch_types_memberships_last_update() IS
  'Mantiene types_memberships.last_update en el momento del último UPDATE. '
  'Antes de la migración 20260928110544 la columna sólo tenía DEFAULT now(), '
  'así que guardaba la fecha de creación de la fila.';

DROP TRIGGER IF EXISTS types_memberships_touch_last_update ON public.types_memberships;

CREATE TRIGGER types_memberships_touch_last_update
  BEFORE UPDATE ON public.types_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_types_memberships_last_update();

-- -----------------------------------------------------------------------------
-- 4. El INSERT pasa a ser admin-only
-- -----------------------------------------------------------------------------
--
-- La migración 20260630180001 agregó policies de UPDATE y DELETE limitadas a
-- admin, y su propio comentario deja constancia de que "antes sólo existían
-- INSERT (authenticated) y SELECT (public)". El INSERT quedó como estaba
-- porque en ese momento no había ninguna UI que creara planes.
--
-- Esta fase construye esa UI, así que el hueco pasa de teórico a alcanzable:
-- sin esto, cualquier usuario autenticado podría crear un plan llamando a
-- PostgREST directo, con el precio que quiera. Mismo tipo de agujero que el
-- del alta VIP anotado en el ADR de la Fase 7.
--
-- Se dropean por nombre descubierto en vez de adivinarlo: la policy vieja se
-- creó fuera de las migraciones (la tabla precede al versionado del schema) y
-- su nombre puede diferir entre dev y prod.

DO $$
DECLARE
  v_policy record;
BEGIN
  FOR v_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'types_memberships'
      AND cmd        = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.types_memberships', v_policy.policyname);
    RAISE NOTICE 'Policy de INSERT eliminada: %', v_policy.policyname;
  END LOOP;
END;
$$;

CREATE POLICY "Admins can insert membership types"
  ON public.types_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- 5. Borrar un plan deja de destruir membresías
-- -----------------------------------------------------------------------------
--
-- `customer_membership.membership_type` referencia a `types_memberships(type)`
-- con ON DELETE CASCADE desde la migración 20260701160000. En una FK a una
-- tabla de catálogo eso es casi con seguridad un copy/paste de la FK de al
-- lado (customer_id → customers, donde el CASCADE sí tiene sentido).
--
-- El efecto real: borrar un plan **borra la membresía de todos los clientes
-- que lo tienen**. No es hipotético — la policy de DELETE existe y es
-- admin-only, así que hoy un admin lo puede hacer desde la API directa. Lo
-- único que lo frena a veces es la FK de membership_payments, que no tiene
-- acción declarada (NO ACTION) y bloquea si el plan tiene pagos. Un plan con
-- clientes pero sin pagos registrados se borra en cascada, sin ruido.
--
-- Pasa a RESTRICT: el borrado falla en voz alta. Discontinuar un plan es
-- `active = false`, y la UI de esta fase no construye botón de eliminar.
--
-- ON UPDATE CASCADE se conserva: renombrar la clave de un tipo debe propagarse
-- a las filas que la referencian, y ahí el cascade es el comportamiento
-- correcto.

ALTER TABLE public.customer_membership
  DROP CONSTRAINT IF EXISTS customer_membership_membership_type_fkey;

ALTER TABLE public.customer_membership
  ADD CONSTRAINT customer_membership_membership_type_fkey
  FOREIGN KEY (membership_type) REFERENCES public.types_memberships(type)
  ON UPDATE CASCADE ON DELETE RESTRICT;
