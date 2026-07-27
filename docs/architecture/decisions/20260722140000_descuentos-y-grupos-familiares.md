# Descuentos como modelo relacional y grupos familiares como entidad de primera clase

**Fecha:** 2026-07-22
**Autor:** emanuel@getlenk.com
**Rama:** feat/discounts-family-groups

## Descripción

El gimnasio aplica un descuento fijo de $2.000 al segundo integrante de un
grupo familiar, pero la app no lo reflejaba: los pagos se registraban por el
neto cobrado, sin distinguir bruto y descuento. Los reportes contables mentían
(no sabíamos cuánto se "regalaba" por descuentos), el vínculo entre integrantes
vivía en la cabeza del operador, y no había forma de cobrar en batch a los
integrantes de un grupo — feature que ya estaba diseñada en el Figma pero
imposible de construir sin modelo relacional.

Este cambio introduce el descuento como modelo con tres entidades vinculadas
(regla, grupo, pago) en vez de tratarlo como una línea contable. Habilita
reportes reales (bruto/descuento/neto), abre la puerta al cobro batch (Fase 2)
y deja la app en condiciones de configurarse por-tenant cuando llegue el
momento de comercializarla — sin migrar datos, sólo agregando UI para editar
reglas.

## Decisiones

### Decisiones de negocio

- **El descuento vive en el pago concreto, no en el cliente.** El operador
  decide en cada renovación si aplica el descuento y a quién de los
  integrantes. Refleja la política actual: la vigencia del descuento
  familiar se re-evalúa manualmente al renovar; si el otro miembro se dio
  de baja, el staff lo detecta al cobrar el siguiente mes y lo quita.
- **Los grupos familiares son entidad de primera clase.** Se descartó
  modelarlos como "descuento con nota" porque perdíamos (a) el vínculo
  que el cobro batch del Figma necesita conocer para pre-cargar el
  descuento por miembro, (b) los reportes por grupo, y (c) la extensión
  natural a otros tipos de vínculo (parejas, corporate) sin migrar.
- **Coexisten dos orígenes de descuento en el mismo bloque de UI:**
  1. **Con regla** — el server detecta que aplica (cliente pertenece a un
     grupo activo con >= 2 miembros) y precarga monto + nombre.
  2. **Ad-hoc** — el operador tildea "Aplicar descuento" sin regla, escribe
     monto y nota **obligatoria**. Se registra `discount_amount` +
     `discount_note`, con `discount_rule_id = NULL`.

  Se descartó "sólo input libre + nota" porque hacía imposible el cobro
  batch del Figma (necesita conocer la regla activa por miembro). Se
  descartó "sólo regla, sin ad-hoc" porque bloqueaba casos legítimos
  excepcionales (promo puntual, favor). Ambos caminos comparten los
  mismos campos en `membership_payments`; sólo cambia si `discount_rule_id`
  es NULL.
- **Fase 1 no incluye cobro batch desde el grupo** (captura 5 del Figma).
  Se pospone para no inflar el PR: requiere resolver checkboxes por
  integrante, estados de vencido, transacciones múltiples. La Fase 1 deja
  el modelo listo para que esa iteración no toque migraciones.
- **Fase 1 no incluye pantalla de administración de reglas.** Hoy hay una
  sola regla que no cambia hace tiempo. Una pantalla de admin (auth +
  form + listado + validaciones + activar/desactivar) es un feature aparte
  que no se justifica para una fila. Se gestiona por SQL/panel Supabase.
  La pantalla llega cuando se comercialice la app.
- **Nombres de UI:** el bloque en el form dice "Aplicar descuento" para
  claridad operativa; el resumen de pago dice "Beneficio aplicado"
  siguiendo el Figma. Son dos vistas del mismo concepto — la primera es
  acción, la segunda es visualización final.

### Decisiones técnicas

- **Tres tablas nuevas:** `customer_groups` (id, type con CHECK 'family',
  name), `customer_group_members` (N:M con `joined_at`/`left_at` para
  historial, UNIQUE parcial sobre miembros activos para evitar duplicados),
  `discount_rules` (id, name UNIQUE, type `fixed|percent`, value,
  applies_to `group_member|manual|promo`, active).
- **`membership_payments` gana cuatro columnas:**
  - `gross_amount` (nuevo NOT NULL, backfilled desde `amount`)
  - `discount_amount` (NOT NULL default 0)
  - `discount_rule_id` (nullable, `ON DELETE SET NULL` para preservar pagos
    históricos si se borra la regla)
  - `discount_note`

  Se mantiene `amount` como el neto para no romper callers actuales; un
  CHECK impone `amount = gross_amount - discount_amount` (invariante
  garantizado a nivel base).
- **Constraint de trazabilidad forzada:** si `discount_amount > 0` y no
  hay regla, `discount_note` es obligatoria a nivel base
  (`membership_payments_adhoc_requires_note`). La UI valida antes y el
  RPC devuelve `DISCOUNT_NOTE_REQUIRED` amigable, pero la base lo impone
  como red de seguridad — no se confía en el cliente.
- **RLS:** `customer_groups` y `customer_group_members` con permisos
  `authenticated` full (mismo patrón operativo que `customers`).
  `discount_rules` con **SELECT abierto a `authenticated`** e
  INSERT/UPDATE/DELETE admin-only.

  Detección tardía durante la implementación: la migración inicial dejó
  `discount_rules` admin-only en las 4 operaciones (clon del patrón de
  `membership_payments`). Rompía el form del operador no-admin: no podía
  leer la regla para aplicarla. Se corrigió con una segunda migración
  ([20260722121000...sql](../../../supabase/migrations/20260722121000_open_discount_rules_select_to_authenticated.sql))
  antes de escribir cualquier código que dependiera de la RLS.
- **`applies_to` en `discount_rules` como enum extensible,** no un flag
  booleano de "es de grupo". Deja lista la extensión a promos generales
  (`applies_to = 'promo'`) o descuentos aplicables desde otro contexto sin
  cambiar schema.
- **`type: 'fixed' | 'percent'` en la regla** aunque hoy la única sea
  fixed. La aplicación siempre se materializa en `discount_amount` (monto
  absoluto en pesos), así el pago no depende del precio vigente para
  reconstruir el descuento retrospectivamente — si mañana suben los
  precios, el descuento de un pago viejo sigue interpretándose igual.
- **Historial con `left_at` en vez de DELETE hard:** un cliente que salió
  del grupo hace 6 meses debe seguir apareciendo como integrante del
  grupo al que pertenecía cuando pagó, si consultás pagos viejos. Índices
  parciales `WHERE left_at IS NULL` mantienen las queries de "activo"
  rápidas sin sacrificar auditoría.
- **RPC `upsert_customer_membership_with_payment` gana 4 params opcionales**
  (`p_gross_amount`, `p_discount_amount`, `p_discount_rule_id`,
  `p_discount_note`) con defaults compatibles: si el caller no envía
  descuento, el RPC asume `gross = p_amount, discount = 0`. El multi-step
  de alta de cliente sigue funcionando sin cambios.
- **`upsertCustomerMembership` client calcula el neto** (`gross - discount`)
  y lo manda como `p_amount`. El RPC valida coherencia (`|neto - (bruto -
  descuento)| ≤ 0.01`) y falla con `DISCOUNT_MATH_MISMATCH` si diverge —
  protección contra un cliente que mande valores inconsistentes.
- **`searchCustomersById` extendido para pre-computar el descuento
  aplicable** en la misma tanda de queries paralelas
  ([src/customer/api/server.ts](../../../src/customer/api/server.ts)). El
  form individual consume `customer.applicable_discount` sin re-consultar
  en cliente. Trade-off: si el server no encuentra regla en el instante
  de renderizar, el form no la ofrece hasta refrescar; asumo que la regla
  cambia con frecuencia infinitesimal.
- **Nuevo dominio `src/group/`** siguiendo el patrón domain-driven del
  proyecto: `consts.ts`, `types.ts`, `api/server.ts`, `api/client.ts`,
  `components/`. Escribo client y server como shapes espejo (no comparten
  código) porque el `createClient` de cada lado no es intercambiable —
  es la misma decisión que ya está tomada en `customer/api/`.
- **Wizard de creación de grupo con mínimo 2 miembros** validado en el
  client, con rollback manual si falla el INSERT de miembros (elimina el
  grupo recién creado). No hay transacción SQL: son dos requests
  separados desde el browser. Alternativa considerada: un RPC atómico
  `create_group_with_members`. Descartada por scope — el rollback manual
  cubre el caso.
- **Detalle de grupo con auto-save de nombre onBlur** (no botón "Guardar").
  Es una edición de un solo campo, no vale un submit dedicado. Baja
  lógica de miembros con `left_at`, `deleteGroup` en cascada (elimina
  members). Los pagos apuntando a la regla `group_member` sobreviven
  porque el FK es `ON DELETE SET NULL` en `discount_rule_id`.
- **Resumen de pago sin línea "Recargo por demora" separada.** El Figma
  la mostraba como línea aparte, pero el usuario decidió mantener el
  recargo unificado en `chargeMode` (surcharge) — el bruto ya lo incluye
  cuando el operador elige esa modalidad. Separarlo requeriría refactor
  del chargeMode que no aporta a este scope. Queda como línea implícita
  dentro de "Precio base".
- **Un solo bloque de commit para migración + código.** Los defaults de
  los params nuevos del RPC hacen que la migración aplicada sola no
  rompa nada (callers viejos siguen funcionando). Igualmente, para dev
  y preview que comparten DB, se aplicaron ambas migraciones primero
  (`db:push-dev`) antes de escribir código que las usara.

## Consideraciones de seguridad

- **Autenticación / Autorización:** `discount_rules` con
  INSERT/UPDATE/DELETE admin-only cierra un vector — un operador no puede
  crearse una regla "50% off" para aplicarla. SELECT abierto es aceptable
  porque los datos no son sensibles (nombres, valores fijos, tipos).
  Grupos son `authenticated` full, mismo criterio que `customers` —
  quien puede editar clientes puede vincularlos.
- **Validación de input:** la nota ad-hoc obligatoria se valida en tres
  capas: (1) UI en el form, (2) RPC con error amigable, (3) CHECK
  constraint en la base. La coherencia bruto - descuento = neto se
  valida en RPC (`DISCOUNT_MATH_MISMATCH`) y en base (CHECK
  `membership_payments_amount_matches`). **Deuda preexistente que no
  cierra este cambio:** `p_amount` (ahora también `p_gross_amount`) no se
  contrasta contra `types_memberships` en el RPC — un cliente malicioso
  podría enviar un monto arbitrario que cumpla las invariantes internas
  pero no coincida con el precio real de la membresía. La deuda quedó
  abierta desde el ADR de 20260715120000 y ahora se extiende a los
  parámetros nuevos.
- **Exposición de datos:** ninguna nueva. Grupos y reglas se leen sólo
  por usuarios autenticados.
- **Dependencias:** ninguna nueva. Se aprovechan `Tabs`, `AlertDialog`,
  `DropdownMenu`, `Textarea` y `Skeleton` ya instalados de shadcn.
- **Infraestructura:** sin cambios. La migración usa las mismas policies
  helpers (`public.is_admin(auth.uid())`) ya existentes.

## Lecciones aprendidas

- **Clonar patrones de RLS sin pensar el flujo termina cerrando features.**
  Copié la RLS admin-only de `membership_payments` a `discount_rules`
  porque conceptualmente son ambas "financieras". Pero `membership_payments`
  se escribe vía RPC SECURITY DEFINER (saltea RLS), mientras que
  `discount_rules` se **lee** desde el cliente para decidir qué mostrar
  en el form. Con SELECT cerrado, el operador no-admin no ve nada y el
  bloque de descuento nunca detecta reglas aplicables. Descubierto al
  escribir la API client — corregido con una migración chica antes de
  seguir. Para próximas tablas de config: preguntar quién las lee antes
  de definir la RLS, no clonar de una tabla con flujo distinto.
- **Los tipos manuales de Supabase se atrasan silenciosamente.** No hay
  `supabase gen types` configurado, así que agregar columnas nuevas a
  `membership_payments` requiere actualizar `src/accounting/types.ts` a
  mano. Sin type-check al toque, el drift entre la base y los tipos
  pasaría desapercibido hasta que un consumidor rompa en runtime.
  Correr `npm run type-check` después de cada bloque atrapó los
  errores temprano — sin ese hábito, el bloque 3 hubiera compilado
  con types desactualizados.
- **La invariante "neto = bruto - descuento" en 3 capas parece
  redundante pero cada una atrapa algo distinto.** UI evita mandar
  pedidos malos; RPC devuelve error amigable si el cliente esquiva la
  UI; CHECK constraint bloquea corrupción por bugs futuros en el RPC
  o inserts directos desde admin. Ninguna reemplaza a la otra.

## Plan

### Pasos

1. Rama `feat/discounts-family-groups` desde `develop`.
2. Migración SQL principal: 3 tablas nuevas + 4 columnas en
   `membership_payments` + backfill + constraints + RLS + seed de la
   regla familiar + `CREATE OR REPLACE` del RPC con 4 params nuevos.
3. Migración correctiva: abrir SELECT de `discount_rules` a
   `authenticated` (descubierta al escribir client APIs).
4. `db:push-dev` para aplicar ambas migraciones a la DB compartida
   dev+preview.
5. Dominio `src/group/`: `consts.ts`, `types.ts`, `api/server.ts`,
   `api/client.ts`.
6. Extender `searchCustomersById` para traer grupos activos y descuento
   aplicable en paralelo.
7. Extender `MembershipPayment`, `CustomerComplete` y `DatabaseErrorCode`
   con los campos y códigos nuevos.
8. Extender `upsertCustomerMembership` client para leer y propagar los 4
   campos de descuento al RPC.
9. UI de grupos: tab "Individuales/Grupos" en listado (`list-with-tabs.tsx`),
   wizard de creación (`create-form.tsx` + `/customer/groups/new`),
   detalle con acciones (`detail.tsx` + `/customer/groups/[id]`), badge
   en ficha del cliente (`badge.tsx`).
10. Form individual: bloque de descuento (estados con regla / ad-hoc),
    resumen de pago con base + beneficio + total, hidden inputs.
11. Validación de descuento en `basicMembershipValidation`.
12. i18n: keys nuevas en `es.json` y `en.json` (namespaces `groups` y
    `discount`, más 2 keys en `customer` y 2 en `common`).
13. `npm run type-check` y `npm run lint` — pasan sin warnings nuevos.
14. ADR + checklist de pruebas locales.
