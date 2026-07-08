# Consolidación de `payment_method` en `membership_payments` y política fail-loud

**Fecha:** 2026-07-08
**Autor:** emanuel@getlenk.com
**Rama:** fix/membership-5-days-label

## Descripción

Al abrir la pantalla `/incomes` en el preview de la rama del PR #21, la
app crasheaba. La causa raíz no era el PR: era un bug **latente** que
combinaba dos problemas independientes.

**Problema 1 — dos sistemas de tipos de pago desincronizados en el código.**

- En [src/membership/consts.ts](../../../src/membership/consts.ts) vivía
  el sistema *activo*: `PAYMENT_CHASH` (con typo) y `PAYMENT_TRANSFER`,
  usados por el form ([membership-form.tsx:91-94](../../../src/customer/membership-form.tsx#L91-L94))
  y por el mapper de i18n `PaymentsTranslation`.
- En [src/accounting/consts.ts](../../../src/accounting/consts.ts) vivía
  un sistema *nuevo pero muerto*: `PAYMENT_METHODS = ['efectivo',
  'transferencia', 'tarjeta', 'paypal', 'otro']` sin ningún import
  externo.

Ambos convivieron en la base de datos sin constraint que los ordenara.
Un `SELECT payment_method, COUNT(*) FROM membership_payments GROUP BY 1`
en prod devolvió **`PAYMENT_TRANSFER`: 16, `PAYMENT_CHASH`: 13,
`Efectivo`: 1** — tres vocabularios distintos conviviendo.

**Problema 2 — fallback silencioso a `'efectivo'` en el flujo de
`charge_diff`.**

Cuando el operador registraba un *upgrade* de tipo de membresía sin
tildar "Pagar cuota" (porque solo quería asentar la diferencia por
`charge_diff`, no re-cobrar), pasaba lo siguiente:

- El select `payment_type` estaba `disabled`
  ([membership-form.tsx:468](../../../src/customer/membership-form.tsx#L468)),
  así que el `FormData` salía con `payment_type = ''`.
- La validación client-side hacía early return por `!isPaid`
  ([customer/utils.ts:80-85](../../../src/customer/utils.ts#L80-L85)) y
  no exigía `payment_type`.
- El cliente convertía el vacío en `'efectivo'` con
  `paymentType || 'efectivo'` ([customer/api/client.ts:316](../../../src/customer/api/client.ts#L316)).
- El RPC coalesceaba otra vez a `'efectivo'` con `COALESCE(p_payment_type,
  'efectivo')` en las tres apariciones del RPC vigente
  ([supabase/migrations/20260707165513_...sql:165,175,230](../../../supabase/migrations/20260707165513_rename_expenses_category_reintegros_to_refunds.sql#L165)).
- El registro del `charge_diff` quedaba con `payment_method = 'efectivo'`
  sin que el operador hubiera elegido método.

Al renderizar ese registro en `/incomes` (usa
[actives.tsx:191](../../../src/customer/stats/actives.tsx#L191)), el
lookup `PaymentsTranslation['efectivo']` devolvía `undefined` y
`t(undefined)` rompía el render. Ese fue el crash del comentario en el
PR #21.

En prod hoy no hay ningún registro con notas `Diferencia por upgrade` —
el bug **no golpeó prod aún** — pero sí hay `'Efectivo'` (1 fila) que
también crashearía por la misma vía si alguien entra a `/incomes`
después de mergear el PR #21.

## Decisiones

### Decisiones de negocio

- **Vocabulario canónico: `PAYMENT_CASH` y `PAYMENT_TRANSFER`.** Se
  conserva la nomenclatura del sistema activo (arreglando el typo
  `CHASH → CASH`) porque es el que ya usan el form, las claves de i18n
  y el 96.7% de los registros históricos. El sistema nuevo de
  `accounting/consts.ts` era código muerto (sin imports externos) y se
  elimina.
- **Solo dos métodos de pago disponibles: efectivo y transferencia.**
  El sistema muerto proponía cinco (efectivo, transferencia, tarjeta,
  paypal, otro). El negocio hoy no acepta tarjeta ni PayPal — se decide
  no exponerlos al operador para no ofrecer opciones inválidas.
- **`charge_diff` requiere método de pago aunque "Pagar cuota" no
  esté tildado.** El *charge_diff* es un cobro real — el operador tiene
  que decir cómo se cobró la diferencia. Antes el select estaba
  gateado detrás del checkbox "Pagar cuota", generando el pago
  silencioso. Ahora se habilita también cuando el operador tildea
  "Registrar cobro adicional".
- **Fail-loud sobre fail-silent en `payment_method`.** Cualquier
  escritura en `membership_payments` sin `payment_method` explícito
  debe fallar con error visible, no rellenarse con un default. El
  operador se entera en el momento, no descubrimos el problema
  semanas después en un reporte contable.

### Decisiones técnicas

- **`CHECK constraint` en `membership_payments.payment_method`.** Se
  agrega `CHECK (payment_method IN ('PAYMENT_CASH', 'PAYMENT_TRANSFER'))`
  como red final. Aunque las tres capas anteriores (form, cliente, RPC)
  fallen, la DB rechaza cualquier valor fuera del vocabulario. La
  columna nunca tuvo constraint — la tabla se creó antes de que se
  versionaran migraciones y quedó como `text` libre.
- **Backfill de valores existentes en la misma migración.** Antes de
  agregar el CHECK constraint hay que normalizar los datos existentes
  (`PAYMENT_CHASH → PAYMENT_CASH`, `Efectivo/efectivo → PAYMENT_CASH`,
  `Transferencia/transferencia → PAYMENT_TRANSFER`), sino el `ALTER
  TABLE ADD CONSTRAINT` fallaría contra las filas legacy.
- **Ambas migraciones en un solo archivo (backfill + CHECK + RPC).** El
  RPC actualizado sin `COALESCE(..., 'efectivo')` podría insertar
  `NULL` si el cliente evade la validación — el CHECK constraint lo
  atraparía. Y la migración del CHECK constraint sin el RPC nuevo
  bloquearía cualquier submit con `payment_type` vacío que hoy
  silenciosamente se rellenaba con `'efectivo'`. Se aplican juntas
  para que el estado siempre sea consistente.
- **`RAISE EXCEPTION` en el RPC solo cuando hay escritura en
  `membership_payments`.** El `type-change-only path` (línea 184-196)
  no cambia `payment_method` — se preserva el existente. Solo se exige
  `p_payment_type` cuando el RPC va a hacer UPDATE con nuevo método o
  INSERT de una fila nueva (`paid path` y bloque de `charge_diff`).
- **Fallback defensivo en el mapper de UI.** En
  [actives.tsx:191](../../../src/customer/stats/actives.tsx#L191) el
  `PaymentsTranslation[x as PaymentType]` era un `as` mentiroso: si el
  valor real de DB no está en el mapper, devuelve `undefined` y `t()`
  crashea. Se envuelve en un IIFE con fallback al string crudo. Con
  el CHECK constraint no debería filtrarse nada, pero el fallback es
  barato y evita crashes futuros por drift entre DB y código.
  [info-resume.tsx:30-32](../../../src/customer/info-resume.tsx#L30-L32)
  ya tenía un fallback equivalente — no se modifica.

### Alternativas descartadas

- **Consolidar hacia el sistema "nuevo" (`efectivo`, `transferencia`,
  ...).** Habría requerido migrar 29 de 30 filas históricas más el
  form, las claves de i18n (`payments.cash`, `payments.transfer`) y
  todos los usos. Con el sistema activo ya calibrado, mover al
  vocabulario muerto era trabajo neto sin ganancia.
- **Solo el fix del crash de UI (fallback defensivo) sin consolidar.**
  Habría dejado el bug del `payment_method = 'efectivo' silencioso`
  sin resolver y el sistema con dos vocabularios convivientes,
  ampliando la deuda técnica.
- **`ENUM` de Postgres en lugar de `CHECK`.** Un ENUM es más
  restrictivo pero cambiar sus valores requiere `ALTER TYPE` y es más
  costoso operacionalmente. `CHECK` es suficiente para dos valores y
  permite ajustes más ágiles si el negocio agrega un método en el
  futuro.
- **Migración separada del RPC (dos archivos).** Como el CHECK
  constraint impacta la nueva versión del RPC (sin `COALESCE`), y la
  vieja depende del `COALESCE`, si `db:push` aplica una sin la otra el
  sistema queda inconsistente por unos segundos. Un solo archivo
  aplicado en una transacción evita ese riesgo.

## Consideraciones de seguridad

- **Autenticación / Autorización:** sin cambios. Las RLS existentes
  siguen aplicando.
- **Exposición de datos:** sin cambios. No se lee ni escribe
  información nueva.
- **Validación de input:** *mejora*. El RPC ahora falla explícito con
  `MISSING_PAYMENT_METHOD` cuando `p_payment_type` viene vacío en
  flujos de escritura, y la DB rechaza cualquier valor fuera del
  vocabulario canónico con el `CHECK constraint`. La validación
  client-side también se amplía al caso `charge_diff` para evitar
  round-trips innecesarios al server.
- **Dependencias:** ninguna nueva.
- **Infraestructura:** sin cambios en RLS, policies ni exposición de
  red.

## Lecciones aprendidas

- **Dos sistemas de tipos para el mismo concepto es deuda que se
  paga con crashes en runtime.** El `PAYMENT_METHODS` de
  `accounting/consts.ts` nunca se importó desde ningún lado, pero
  quedó "por si acaso" — y el fallback silencioso terminó usando su
  vocabulario en la DB, produciendo mismatch con el otro sistema
  que sí se leía en la UI.
- **`as X` en TypeScript no es una validación — es una mentira que
  el compilador cree.** El `payment_method as PaymentType` de
  [actives.tsx:191](../../../src/customer/stats/actives.tsx#L191)
  compilaba perfecto pero crasheaba en runtime cuando el valor real
  no estaba en el union. Cada `as` sobre un valor de fuente externa
  (DB, red, formData) es una deuda potencial.
- **Fallback silencioso al que "nunca se llega" siempre se llega.**
  El `paymentType || 'efectivo'` era defensa "por si acaso" — se
  documentaba mentalmente como *no debería pasar* y por eso nadie
  validó qué pasaría si pasaba. La lección: si es *no debería pasar*,
  fallar ruidoso, no ocultar.
- **La ausencia de `CHECK constraint` en columnas "de tipo enumerado"
  es una bomba de tiempo.** La columna `payment_method` fue text libre
  desde el día uno porque la tabla se creó antes de que se versionaran
  migraciones. Convivieron cuatro valores distintos (`PAYMENT_CHASH`,
  `PAYMENT_TRANSFER`, `Efectivo`, `efectivo`) sin que nada los
  ordenara. Los ENUMs o CHECKs deberían agregarse *el mismo día* que
  se decide que una columna representa un conjunto cerrado.
- **La validación de un formulario no es "por acción del usuario", es
  "por escritura que produce".** El razonamiento "si `!isPaid`
  entonces no hay nada que validar" era intuitivo pero incorrecto: el
  form podía disparar una escritura en `membership_payments` por la
  rama del `charge_diff` sin `isPaid`. La validación tiene que
  seguir a las escrituras que va a producir, no a las intenciones
  aparentes del usuario.

## Plan

### Pasos

1. **Migration**: `20260708152529_consolidate_membership_payments_payment_method.sql`
   — backfill de `PAYMENT_CHASH/Efectivo/efectivo → PAYMENT_CASH` y
   `Transferencia/transferencia → PAYMENT_TRANSFER`, agrega
   `CHECK constraint`, y reescribe el RPC reemplazando las tres
   apariciones de `COALESCE(p_payment_type, 'efectivo')` por
   validación explícita con `MISSING_PAYMENT_METHOD`.
2. **`src/membership/consts.ts`**: renombrar `PAYMENT_CHASH` a
   `PAYMENT_CASH` (el string interno del `as const` también). Todos
   los usos son internos al mismo archivo — no hay imports externos
   de `PAYMENT_CHASH` en el resto del código.
3. **`src/accounting/consts.ts`**: eliminar `PAYMENT_METHODS`,
   `PaymentMethod`, `PAYMENT_METHOD_LABELS`, `DEFAULT_PAYMENT_METHOD`
   (código muerto sin imports externos). Se preservan
   `EXPENSE_CATEGORIES` y sus labels — están en uso.
4. **`src/customer/api/client.ts`**: reemplazar el fallback silencioso
   `paymentType || 'efectivo'` por `paymentType || null` para que el
   RPC devuelva `MISSING_PAYMENT_METHOD` si el cliente evade la
   validación upstream.
5. **`src/customer/utils.ts`**: derivar `requiresPaymentType` para
   incluir el caso `charge_diff` con `adjustment_amount` presente.
   Mover la exigencia de `payment_type` para que aplique también
   cuando `!isPaid` pero hay `charge_diff`.
6. **`src/customer/membership-form.tsx`**: derivar
   `requiresPaymentType = payment === true || (registerAdjustment &&
   adjustmentAction === 'charge_diff')` y usarlo en `isDisabled` del
   select `payment_type` para que se habilite en el flujo del
   `charge_diff` aunque "Pagar cuota" esté destildado.
7. **`src/customer/stats/actives.tsx`**: fallback defensivo en el
   lookup del mapper para no crashear si aparece un valor no
   reconocido (defensa en profundidad — el CHECK constraint ya lo
   previene desde DB).
8. **Verificaciones**: `npm run type-check` y `npm run lint` — mismo
   baseline preexistente.
