-- =============================================================================
-- Migration: birth_date y notes en customers
-- =============================================================================
-- Contexto: el tab "Info" del Perfil del cliente (Fase 6b del rediseño v2)
-- muestra "Fecha de nacimiento" y "Observaciones", y el formulario de alta
-- (Fase 7) los pide como campos del paso 1 y del paso 2 respectivamente.
-- Ninguna de las dos columnas existía. Son las brechas B10 y B11 del plan v2
-- (docs/v2/PLAN.md).
--
-- Por qué acá y no en la Fase 7: el perfil las *muestra*, así que sin las
-- columnas el tab Info queda incompleto contra el diseño. El alta las va a
-- *escribir* después; agregarlas ahora deja la UI de lectura lista y no
-- adelanta ninguna decisión de la fase que viene.
--
-- Seguridad de deploy: ambas son nullable y sin default, así que la migración
-- es puramente aditiva — no hay backfill, no rompe ningún INSERT existente
-- (que no las nombra) y el código viejo sigue funcionando sin cambios. Se puede
-- aplicar antes o después del release sin ventana de riesgo.
--
-- birth_date es `date` y no `timestamptz` a propósito: una fecha de nacimiento
-- es un día calendario, no un instante. Guardarla como timestamptz la expondría
-- al mismo corrimiento de 3 horas que ya desalineó pagos y gastos
-- (ADR 20260709153000). Con `date` no hay zona horaria que aplicar.
--
-- Idempotente: IF NOT EXISTS.
-- =============================================================================

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN public.customers.birth_date IS
  'Fecha de nacimiento (día calendario, sin zona horaria). Opcional.';

COMMENT ON COLUMN public.customers.notes IS
  'Observaciones internas del staff sobre el cliente. Texto libre, opcional.';
