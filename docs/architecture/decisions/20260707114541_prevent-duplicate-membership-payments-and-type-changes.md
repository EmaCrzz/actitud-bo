# Idempotencia de `membership_payments`, cambios de tipo intra-vigencia y restricción de VIP

**Fecha:** 2026-07-07
**Autor:** ema_villanueva@hotmail.com
**Rama:** fix/idempotent-membership-payments

## Descripción

Cada submit del form `/customer/edit/[id]/membership` insertaba una fila
nueva en `membership_payments`, incluso cuando el operador solo entraba a
revisar o corregir. Esto corrompía la contabilidad, que suma `amount` de
todas las filas del mes ([src/accounting/api/server.ts:230-259](../../../src/accounting/api/server.ts#L230-L259)),
inflando ingresos falsamente. La evidencia real: para un solo cliente
(`454cff44-…`) había **9 filas de `PAYMENT_CHASH`** con `payment_date =
2026-07-01` insertadas en momentos distintos por múltiples submits del
form. La vista mensual sumaba 260000 en lugar de los 30000 realmente
cobrados.

Al abordar el fix estructural surgieron dos requerimientos adicionales
del negocio:

1. **Cambio de tipo intra-vigencia**: cuando un cliente pide pasar de
   `MEMBERSHIP_TYPE_5_DAYS` a `MEMBERSHIP_TYPE_3_DAYS` (o viceversa)
   dentro del período que ya pagó, el sistema tiene que reflejar el
   ajuste monetario en algún lado — no simplemente sobrescribir la fila
   perdiendo la traza contable.
2. **Restricción de VIP**: el tipo `MEMBERSHIP_TYPE_VIP` no debe poder
   ser asignado por operadores no-admin, y su form debe simplificarse
   para reflejar que no hay dinero involucrado (solo la asistencia
   tiene sentido).

## Decisiones

### Decisiones de negocio

- **`membership_payments` = cobros reales.** Una fila por cobro
  efectivo. Correcciones al pago vigente (método, monto, fecha) son
  UPDATE de esa fila, no INSERT.
- **Criterio de "mismo período" = vigencia de la membresía.**
  `customer_membership.expiration_date >= hoy` → UPDATE del pago
  vigente. Expirada → INSERT. Simple y refleja el modelo real de
  cobranza (un pago cubre un período).
- **DAILY siempre INSERT.** Los pases diarios vencen el mismo día que
  se registran; cada nuevo pase es una transacción independiente.
- **Cambio de tipo intra-vigencia**:
  - **Downgrade** (nuevo tipo más barato): UPDATE del pago con el nuevo
    tipo/amount + INSERT en `expenses` (categoría `reintegros`) por la
    diferencia. La descripción del gasto se genera automáticamente con
    el nombre del cliente; las notas indican el cambio de tipo.
  - **Upgrade** (nuevo tipo más caro): UPDATE del pago con el nuevo
    tipo/amount + INSERT una nueva fila en `membership_payments` por el
    delta, con nota de "diferencia por upgrade".
  - **Monto sugerido, editable.** El sistema calcula el ajuste desde
    `types_memberships` y lo prellena en el form, pero el operador
    puede modificarlo (casos con recargos, precio medio, negociaciones
    puntuales).
  - **Checkbox destildado por default.** Registrar el ajuste requiere
    acción explícita del operador. Si no se tildea, el pago se
    actualiza al nuevo tipo/amount pero no se genera contrapartida
    contable — decisión consciente del operador (ej: cortesía, error de
    ingreso).
- **VIP restringido a admin, con form simplificado**:
  - El select "Tipo de membresía" no muestra la opción VIP para
    no-admins.
  - Al seleccionar VIP, el form oculta checkbox de "Pagar cuota",
    datepickers, monto, método de pago y el alert de cambio de tipo.
  - Solo permanece visible el checkbox de "Registrar primera
    asistencia", que ahora se libera para VIP (antes estaba disabled
    porque dependía del checkbox de pago).
- **Duplicados históricos: fuera de scope.** El equipo los limpia con
  queries directas contra prod, con backup previo. El backfill de
  `current_payment_id` apunta al `created_at` más reciente; cuando los
  duplicados se eliminen, el `ON DELETE SET NULL` deja el puntero en
  NULL y el próximo submit lo reestablece por INSERT.

### Decisiones técnicas

- **FK explícita `customer_membership.current_payment_id`** →
  `membership_payments.id` (nueva columna, ON DELETE SET NULL). Match
  por valores mutables (`payment_date + membership_type`) rompía cuando
  el operador los editaba: el UPDATE de `customer_membership` cambiaba
  los valores pero la fila del pago conservaba los viejos, y la
  próxima iteración fallaba en encontrarla — cayendo en INSERT y
  duplicando. La FK es explícita, inmune a ediciones, y sobrevive a
  cualquier flujo.
- **`SELECT ... FOR UPDATE`** sobre `customer_membership` al inicio del
  RPC. Mitiga concurrencia real (dos operadores editando el mismo
  cliente en simultáneo).
- **RPC con parámetros nuevos**:
  `p_type_change_action` (`NULL | 'refund' | 'charge_diff'`) y
  `p_adjustment_amount`. El RPC decide UPDATE vs INSERT según vigencia
  + tipo, y opcionalmente genera la contrapartida contable (expenses o
  payment adicional).
- **Chequeo de rol admin server-side** para VIP. El RPC es
  `SECURITY DEFINER`; el chequeo se hace contra `auth.uid()` y
  `user_roles`. Aunque el UI filtre VIP para no-admins, cualquier
  request directa a la RPC devuelve `UNAUTHORIZED_VIP_ASSIGNMENT`.
- **Categoría `reintegros` agregada a `EXPENSE_CATEGORIES`** en
  [src/accounting/consts.ts](../../../src/accounting/consts.ts). Se
  reutiliza la infraestructura existente de expenses/gastos en lugar
  de introducir un modelo nuevo.
- **Modo DAILY del form**: se ocultan los datepickers y se envían
  `start_date = end_date = hoy` como hidden inputs. La validación
  client-side (`basicMembershipValidation`) se relajó para DAILY —
  antes exigía `end > start`, ahora permite iguales para ese tipo.

### Alternativas descartadas

- **Ordenar por `payment_date` con `created_at` como desempate en la
  lectura del detalle** (fix intentado antes de entender la profundidad
  del bug). No resuelve el problema porque el `payment_date` se propaga
  desde `start_date` viejo del form — hay pagos genuinamente insertados
  con `payment_date` incorrecto que la query trae "correctamente".
- **Criterio de idempotencia por mismo mes calendario del
  `payment_date`**. Rompía con DAILY (varios pases en un mes
  colapsados en una fila).
- **Siempre editar el último pago del cliente** (sin criterio de
  vigencia). Perdía historial en renovaciones espaciadas: si un
  cliente estuvo 6 meses sin pagar y vuelve, el nuevo pago no debería
  editar el pago viejo.
- **UPDATE ciego en cambio de tipo intra-vigencia**. Sobrescribía la
  fila original sin dejar traza del ajuste monetario. Contablemente
  incorrecto.
- **Cambiar el default del `start_date` a "hoy"** para forzar
  renovaciones nuevas por fecha. Se descartó porque restringía la
  operación legítima de registrar un pago retroactivo. El fix
  estructural del RPC hace innecesario tocar el default.
- **Separar UX en `/renew` vs `/edit-membership`.** Al confirmar el
  usuario que el 99% de los flujos son "renovar y listo", la
  idempotencia del RPC ya cubre el resto de casos sin agregar una
  segunda pantalla.

## Consideraciones de seguridad

- **Autenticación / Autorización**: se agrega chequeo de rol admin
  server-side para `MEMBERSHIP_TYPE_VIP`, con error explícito
  `UNAUTHORIZED_VIP_ASSIGNMENT`. Es defensa en profundidad frente a un
  cliente que bypasee el UI. El resto de operaciones sigue con las RLS
  existentes.
- **Exposición de datos**: sin cambios en qué datos se leen o
  escriben. La categoría `reintegros` en `expenses` no expone
  información nueva más allá de la ya expuesta en el módulo de
  contabilidad.
- **Validación de input**: el RPC valida los tipos y montos como
  antes; el nuevo `p_adjustment_amount` se rechaza si es NULL o <= 0
  cuando se usa. La validación client-side también se ajustó para
  DAILY (permitir `end == start`).
- **Dependencias**: no se agregan dependencias nuevas.
- **Infraestructura**: sin cambios en RLS ni policies. Las policies
  existentes en `expenses` (admin-only según
  20260702120000_finances_admin_only_rls) cubren el nuevo caso —
  pero la inserción del reintegro corre desde el RPC
  (`SECURITY DEFINER`), así que el operador no-admin puede disparar la
  operación a través del form sin violación de RLS.

## Lecciones aprendidas

- **Cuando el operador confirma sin cambios, el sistema no debería
  registrar transacciones.** El "confirmar por inercia" era una fuente
  masiva de duplicados y no lo detectamos hasta ver 9 filas en
  `membership_payments` para un cliente.
- **`payment_date` en `membership_payments` no era la fecha real del
  cobro** en muchos casos: heredaba el `start_date` del form, que
  arrancaba con el `last_payment_date` anterior. Cualquier query que
  ordenaba por `payment_date` estaba mostrando datos falsos. Priorizar
  `created_at` para "último pago registrado" era necesario en un fix
  previo, pero el problema de fondo era el modelo append-only sin
  criterio de idempotencia.
- **Match por valores mutables es una anti-práctica cuando esos
  valores pueden cambiar.** Cuando aparece la necesidad de "encontrar
  la fila anterior que corresponde a X", la respuesta correcta suele
  ser una FK, no una query heurística.
- **Los cambios de tipo intra-vigencia son un caso raro pero real.**
  El operador puede querer permitirlos y necesita una forma de
  reflejar el ajuste monetario sin corromper la contabilidad. La
  tabla `expenses` ya existente resolvió esto sin agregar tablas.
- **La restricción de VIP a admin es dual**: UI (para que el operador
  no vea la opción y no se confunda) + server (para bloquear bypass
  del UI). Solo una de las dos no es suficiente.
- **`CREATE OR REPLACE FUNCTION` en Postgres no reemplaza si la firma
  cambió** — crea un overload. Detectado en testing: la migración del
  RPC nuevo dejó dos versiones convivientes, y las llamadas del
  cliente viejo iban a la firma antigua sin actualizar
  `current_payment_id`. Fix: `DROP FUNCTION` explícito con la firma
  vieja antes de recrear.
- **Atar el UPDATE del pago al checkbox "Pagar cuota" no alcanzaba.**
  Cuando el operador cambia el tipo intra-vigencia sin re-cobrar, el
  pago quedaba con el tipo viejo mientras `customer_membership` tenía
  el tipo nuevo. El UPDATE del pago tiene que dispararse por dos
  motivos independientes: cobro (`p_is_paid = true`) o cambio de tipo
  intra-vigencia. En el segundo caso el amount se toma del
  `types_memberships.amount` del nuevo tipo (no del form).
- **El componente `InputCurrency` no propaga `defaultValue` a su
  hidden input.** El hidden interno usa un `numericValue` que arranca
  vacío hasta que el usuario edita. Si el operador tildea el checkbox
  y confirma sin tocar el input, el FormData recibe `''`. Fix: usar el
  patrón que ya existía en el mismo form (hidden input manual + state
  controlado) en lugar del hidden interno del componente.
- **`auth.uid()` no coincide con `user_roles.user_id`.** En este repo
  `user_roles.user_id` apunta a `profile.id`, no a `auth.users.id`. El
  primer chequeo admin del RPC fallaba con todos los admins porque
  hacía `WHERE user_id = auth.uid()`. Fix: `JOIN profile ON auth_id =
  auth.uid()` y matchear por `profile.id`. Mismo patrón que ya usan
  `getCurrentUserRoles` (server) y `useAuth` (client).
- **VIP invisible para no-admin si el cliente ya lo tiene** rompía la
  UX: el select arrancaba vacío. Fix: mostrar VIP en el select si
  `isAdmin || currentType === VIP`. El no-admin ve el estado real y
  puede cambiarlo a otro tipo (el server-side sigue bloqueando
  cualquier intento de asignar VIP desde no-admin).

## Plan

### Pasos

1. **Migration**: `20260707113340_add_current_payment_id_to_customer_membership.sql`
   — nueva columna FK + backfill con `created_at` más reciente por
   cliente.
2. **Migration**: `20260707113341_upsert_customer_membership_with_payment_idempotent.sql`
   — primera versión del RPC con `SELECT FOR UPDATE`, decisión
   UPDATE/INSERT por vigencia + FK, manejo de refund/charge_diff,
   restricción de VIP a admin, y unificación del bloque de asistencia
   (que ahora también corre para VIP).
3. **Migration**: `20260707120000_drop_legacy_upsert_membership_with_payment_and_rebackfill.sql`
   — detectado en testing: `CREATE OR REPLACE FUNCTION` no reemplaza si
   la firma cambia (crea overload). DROP explícito de la firma antigua
   y re-ejecución del backfill que había quedado sin correr para
   clientes cuyo pago cayó a la firma vieja.
4. **Migration**: `20260707130000_upsert_membership_with_payment_decouple_type_change.sql`
   — detectado en testing: el UPDATE del pago vigente estaba dentro de
   `IF p_is_paid`, y al cambiar el tipo intra-vigencia sin re-cobrar
   el pago quedaba desincronizado con `customer_membership`. Reescritura
   con dos ramas independientes: cobro (usa amount del form) y
   type-change-only (usa amount del `types_memberships` del nuevo
   tipo, preserva método y fecha).
5. **Migration**: `20260707140000_fix_vip_admin_check_via_profile.sql`
   — detectado en testing: el chequeo admin del RPC hacía
   `WHERE user_id = auth.uid()` pero `user_roles.user_id` apunta a
   `profile.id`, no a `auth.users.id`. Se corrige con
   `JOIN profile ON auth_id = auth.uid()`.
6. **`src/accounting/consts.ts`**: categoría `reintegros` agregada.
7. **`src/customer/membership-form.tsx`**:
   - `usePermissions()` para detectar admin.
   - VIP en `membershipOptions` si `isAdmin || currentType === VIP`
     (fix de UX detectado en testing: no-admin editando cliente VIP
     veía el select vacío).
   - Default del checkbox "Pagar cuota" según vigencia
     (`!isCurrentActive`).
   - Ocultar datepickers para VIP y DAILY; hidden inputs con hoy para
     DAILY.
   - Ocultar checkbox "Pagar cuota" para VIP (antes se mostraba con un
     icon disabled).
   - Alert de cambio de tipo intra-vigencia con `InputCurrency`
     **controlado por state** (no `defaultValue`, que dejaba el hidden
     interno del componente vacío) + hidden input manual con `name`
     para el FormData + checkbox destildado por default.
   - Habilitar el checkbox de asistencia para VIP.
8. **`src/customer/utils.ts`**: relajar validación de fechas para
   DAILY (permitir `end == start`).
9. **`src/customer/api/client.ts`**: extender payload al RPC con
   `p_type_change_action` y `p_adjustment_amount`.
10. **Cleanup one-off en dev** (fuera del código, corrido a mano):
    borrado de duplicados históricos en `membership_payments` con
    `ROW_NUMBER() OVER (PARTITION BY customer_id, payment_date,
    amount, membership_type ORDER BY created_at DESC)` y `WHERE rn > 1`,
    excluyendo `MEMBERSHIP_TYPE_DAILY` (cuyos "duplicados" son
    legítimos). Re-ejecutar el backfill de `current_payment_id`
    después. En dev el delta fue -270000 ARS (de 510500 a 240500).
    Para prod: mismo script, con backup previo.
11. **Verificaciones**: `npm run type-check` y `npm run lint` — mismo
    baseline preexistente (4 warnings de `no-console`).
