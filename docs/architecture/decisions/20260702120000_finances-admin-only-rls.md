# Finanzas admin-only: RLS de defensa en profundidad + 403 en la API

**Fecha:** 2026-07-02
**Autor:** federubents@gmail.com
**Rama:** fix/route-and-rls-hardening

## Descripción

Las tablas de finanzas (`expenses` y `membership_payments`) tenían policies RLS
laxas: cualquier usuario `authenticated` podía SELECT/INSERT/UPDATE/DELETE. La
única protección real vivía en la capa server (`requireAdmin()` en
`src/accounting/api/server.ts`). Es un modelo frágil: si una ruta o función
futura olvida ese guard, la base de datos no frena nada, y datos financieros
(ingresos, gastos) quedan expuestos o manipulables por cualquier miembro del
staff logueado.

Este cambio agrega **defensa en profundidad**: las tablas de finanzas quedan
admin-only también a nivel RLS, alineado con el modelo RBAC de la app
(`finances:{read,create,update,delete}` = solo `admin`, ver
`src/auth/permissions.ts`). Además, los route handlers de accounting ahora
devuelven `403` (en vez de `500`) cuando el guard de admin rechaza, para que el
caller distinga un problema de permisos de un error real del servidor.

## Decisiones

### Decisiones de negocio

- **Los datos de finanzas son admin-only, incluido el SELECT.** Se optó por
  bloquear también la lectura (no solo los writes). Consecuencia: la versión
  client de `getActiveMemberships` (`src/membership/api/client.ts`), consumida
  en `/stats/customers` — accesible a no-admins —, hace un SELECT directo a
  `membership_payments` para mostrar el "último pago". Con RLS admin-only ese
  SELECT devuelve 0 filas para no-admins y `last_payment` queda `null`; la lista
  de clientes activos sigue funcionando, solo se oculta el monto del último pago
  a quien no es admin. Eso es exactamente el objetivo (cerrar la fuga de montos).
  - **Alternativa descartada:** bloquear solo los writes y dejar el SELECT
    abierto. Evitaba el cambio de comportamiento en `/stats/customers`, pero
    dejaba a managers/employees leyendo importes de pagos, contradiciendo el
    RBAC. Se priorizó consistencia con el modelo de permisos.

### Decisiones técnicas

- **RLS con el helper `public.is_admin(auth.uid())`** (creado en la migration
  `20260630180001`), replicando el patrón ya usado en `types_memberships`. Una
  policy por operación (SELECT/INSERT/UPDATE/DELETE) por tabla.
- **El flujo de pago de no-admins no se toca.** El pago que registra un
  employee/manager al renovar la membresía de un cliente entra por la función
  `upsert_customer_membership_with_payment`, que es `SECURITY DEFINER` y por lo
  tanto ejecuta como owner, salteando RLS. Los accesos DIRECTOS a estas tablas
  solo ocurren desde el módulo de accounting (ya admin-gated). Por eso el
  bloqueo RLS es seguro y no rompe la operación diaria.
- **Migration idempotente** (`DROP POLICY IF EXISTS` + `CREATE`), consistente
  con el estilo del resto de `supabase/migrations/`.
- **Helper `accountingErrorResponse`** (`src/accounting/api/http.ts`) centraliza
  el mapeo de error → status: `'Insufficient permissions'` → 403, resto → 500.

## Consideraciones de seguridad

- **Autenticación / Autorización:** refuerza la autorización. Antes el borde
  admin/finanzas se sostenía solo en la capa app; ahora también en la DB. El
  RBAC a nivel ruta (layouts con `requireAdminOrRedirect`) ya estaba y no se
  modifica.
- **Exposición de datos:** cierra la exposición de importes de pagos a
  no-admins vía el enriquecimiento de `/stats/customers`.
- **Validación de input:** sin cambios; no se procesa input nuevo.
- **Dependencias:** no se agregan dependencias.
- **Infraestructura:** cambio de policies RLS. Requiere aplicar la migration a
  DEV y luego a PROD (`npm run db:push-dev` / `db:push-prod`). Hasta aplicarla,
  el código no cambia el comportamiento de la DB.

## Lecciones aprendidas

- El `SECURITY DEFINER` del RPC de pago es lo que hace viable el bloqueo RLS sin
  romper la operación de no-admins. Conviene mantener ese contrato: cualquier
  escritura de pagos por no-admins debe pasar por una función SECURITY DEFINER,
  no por acceso directo a la tabla.

## Plan

### Pasos

1. Migration `20260702120000_finances_admin_only_rls.sql`: reemplazar las
   policies `authenticated` de `expenses` y `membership_payments` por policies
   admin-only en las 4 operaciones, usando `public.is_admin(auth.uid())`.
2. `src/accounting/api/http.ts`: helper `accountingErrorResponse` (403 en
   permisos, 500 en el resto).
3. Actualizar los 5 route handlers de `src/app/api/accounting/*` para usar el
   helper en sus `catch`.
4. Verificar `type-check` + `lint`.
5. Aplicar la migration en DEV (`db:push-dev`), validar en preview, y luego en
   PROD (`db:push-prod`).

## Fuera de alcance

- Separación de permisos manager-vs-employee en `customers`/`customer_membership`/
  `assistance` (hoy abiertas a todo `authenticated`, aparentemente intencional
  para que todo el staff opere el día a día). Queda como decisión futura.
- Gatear `/stats/membership`: muestra *conteos* por tipo (vía RPC
  `get_membership_stats`), no montos, y el RBAC permite `memberships:read` a
  todos los roles. Se deja accesible a propósito.
