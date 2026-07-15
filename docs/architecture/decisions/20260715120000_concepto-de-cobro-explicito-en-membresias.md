# El concepto de cobro de membresía pasa a ser explícito, no inferido de una fecha

**Fecha:** 2026-07-15
**Autor:** emanuel@getlenk.com
**Rama:** fix/membership-charge-mode

## Descripción

El form de membresías cobraba medio mes automáticamente y sin posibilidad de
desactivarlo, en base a una regla de fecha. Eso rompía dos casos reales del
negocio:

1. **El cliente que paga tarde no pagaba recargo.** La regla de medio mes
   suprimía explícitamente la sugerencia de recargo
   ([membership-form.tsx:186](../../../src/customer/membership-form.tsx#L186),
   `if (shouldApplyMiddleAmount) return false`). Un cliente que debía pagar el
   día 5 y pagaba el 20 caía en medio mes y el switch de recargo ni siquiera se
   renderizaba: terminaba pagando **menos** por pagar tarde.
2. **La quincena por pedido del cliente no existía.** El cliente que quiere ir
   solo dos semanas a principio de mes no tenía forma de que se le cobrara medio
   mes, porque la modalidad dependía del calendario y no de su pedido.

Además la regla estaba mal implementada: leía `renewal_date` — la renovación
**anterior** — en vez de la fecha de hoy
([membership-form.tsx:172-182](../../../src/customer/membership-form.tsx#L172-L182)).
Un cliente que renovó el 20 del mes pasado tenía `renewal_date` con día 20, así
que `20 >= 15` daba verdadero **cualquier día del mes siguiente**. El síntoma
reportado ("al llegar al día 15 se cobra medio mes") era en realidad "el que
alguna vez renovó pasado el 15 queda enganchado en medio precio hasta que
renueve antes del 15".

El error de fondo es de modelo: la app **infería** una decisión comercial desde
una fecha. El concepto de cobro es una decisión del operador; la fecha puede
sugerir, no decidir.

## Decisiones

### Decisiones de negocio

- **La modalidad de cobro la elige el operador.** Se expone como una elección
  explícita entre tres opciones excluyentes — Mes completo / Medio mes /
  Mes + recargo — que se corresponden 1:1 con las tres columnas de precio que ya
  existen en `types_memberships` (`amount`, `middle_amount`,
  `amount_surcharge`).
- **El default es siempre Mes completo.** Nada se pre-selecciona por fecha. Es
  la opción segura: nunca se cobra de menos por omisión, y la quincena vuelve a
  ser lo que el negocio dice que es — un pedido del cliente, no una consecuencia
  del calendario. Se descartó pre-seleccionar según fecha porque reproduce el
  bug original cuando el operador no mira el selector.
- **La señal de recargo se conserva como hint, sin forzar.** Si el cliente tiene
  asistencias del mes y pasó el día 10 — la regla que hoy funciona bien — se
  muestra un aviso al lado del selector, pero no cambia la selección.
- **Las tres modalidades son mutuamente excluyentes.** No existe "medio mes con
  recargo" porque no existe una cuarta columna de precio. Se descartó agregarla:
  requiere tocar la base y el usuario lo excluyó del alcance.
- **VIP y Diario no muestran selector.** Un pase diario no tiene quincena ni
  recargo; VIP no tiene cobro.

### Decisiones técnicas

- **Un solo estado `chargeMode: 'full' | 'half' | 'surcharge'`** reemplaza a
  `shouldApplyMiddleAmount` (regla forzada), `shouldSuggestSurcharge` (regla
  forzada) y `applySurcharge` (estado colgado).
- **Fuente única del monto (`chargeAmount`).** Antes había dos cálculos
  paralelos con prioridades **invertidas**: `displayAmount` priorizaba medio mes
  ([:205](../../../src/customer/membership-form.tsx#L205)) y `actualAmount`
  priorizaba recargo ([:227](../../../src/customer/membership-form.tsx#L227)).
  Con los flags viejos no se disparaba porque eran excluyentes, pero era una
  bomba de tiempo: la UI podía mostrar un precio y el hidden input mandar otro.
  Ahora el input visible y el hidden leen la misma variable, así que no pueden
  divergir por construcción.
- **`useEffect` que resetea `chargeMode` al cambiar de tipo.** Arregla el estado
  colgado: antes, si el operador prendía el recargo y después cambiaba a Diario,
  el switch se desmontaba pero `applySurcharge` quedaba en `true`.
- **El selector solo ofrece modalidades con precio cargado.** Si `middle_amount`
  es `null` para ese tipo, la opción no aparece. El código viejo asumía que el
  precio existía antes de decidir usarlo.
- **`renewal_date` deja de participar del precio.** Se sigue escribiendo desde
  el RPC; solo se lo saca de la decisión de cobro.
- **Radios nativos en vez de `@radix-ui/react-radio-group`.** No hay
  `radio-group` instalado y no se justifica una dependencia nueva para un
  control usado una vez. Los radios nativos dan navegación por teclado y
  semántica de form gratis. Se descartó `HybridSelect` (el idiom del form)
  porque esconde los precios hasta abrir el dropdown: el operador necesita ver
  las tres opciones al decidir.
- **Sin cambios de base de datos.** No se tocan tablas, RPC ni migraciones — no
  hace falta `db:push-dev` para validar en preview.

## Consideraciones de seguridad

- **Autenticación / Autorización:** sin cambios. La visibilidad de VIP sigue
  gobernada por `isAdmin` y las policies de RLS quedan intactas.
- **Validación de input:** sin cambios netos, pero vale registrar una deuda
  **preexistente**: `p_amount` viaja al RPC desde un hidden input del browser y
  se inserta tal cual; la única validación es `p_amount > 0`
  ([20260709000000_daily_expiration_end_of_day_ar.sql:173-180](../../../supabase/migrations/20260709000000_daily_expiration_end_of_day_ar.sql#L173-L180)).
  Nunca se contrasta contra `types_memberships`, así que cualquiera con la
  consola abierta puede registrar un pago arbitrario. Este cambio no lo agrava
  — el monto sigue derivándose de precios de la tabla y el input sigue
  `isDisabled` — pero tampoco lo cierra: requiere migración y quedó fuera de
  alcance por decisión explícita del usuario. **Queda como deuda abierta.**
- **Exposición de datos:** ninguna. Los tres precios ya se enviaban al cliente
  en el mismo `select`; el selector solo los muestra.
- **Dependencias:** ninguna nueva (motivo por el que se descartó
  `@radix-ui/react-radio-group`).
- **Infraestructura:** sin cambios.

## Lecciones aprendidas

- **El bug reportado no era el bug real.** El síntoma ("al día 15 se cobra medio
  mes") apuntaba a una regla de calendario; la causa era leer `renewal_date` en
  vez de la fecha actual. Un fix que solo hiciera la regla opcional habría
  dejado viva la lectura incorrecta.
- **Dos cálculos paralelos del mismo valor divergen.** `displayAmount` y
  `actualAmount` tenían prioridades invertidas y nadie lo notó porque los flags
  eran excluyentes por accidente. Cuando la UI muestra un número y el form manda
  otro, el único fix estructural es que sean la misma variable.
- **Inferir decisiones comerciales desde fechas es frágil.** Codifica una
  política del negocio en un `if` que nadie puede ver ni cambiar desde la UI.
  Cuando la política tiene excepciones — y siempre las tiene — no hay salida.
- **Deuda relacionada, no abordada:** `last_update` de `types_memberships` se
  lee en la UI de precios ([amount-form.tsx:131](../../../src/membership/components/amount-form.tsx#L131),
  [amounts.tsx:54](../../../src/membership/components/amounts.tsx#L54)) pero
  nunca se escribe: ni `updateMembershipPrices()` lo setea ni hay trigger.
  Muestra siempre el valor viejo o `-`.

## Deuda abierta: mostrar el concepto de cobro en Ingresos

Durante la revisión surgió el pedido de que el desplegable de cada cliente en
**Ingresos** muestre "Mes completo" / "Medio mes / quincena" en vez de la
etiqueta genérica "Monto"
([actives.tsx:184-187](../../../src/customer/stats/actives.tsx#L184-L187)).
**Se descartó por ahora** porque la solución correcta exige tocar la base, y eso
quedó fuera de alcance por decisión explícita del usuario.

El obstáculo: `membership_payments` guarda el `amount` pero **no el concepto que
lo produjo**. Un pago de medio mes y uno de mes completo son dos números en la
misma columna, indistinguibles.

Lo que sí existe y habilita el fix cuando se decida encararlo:

- **La columna `notes` ya está en `membership_payments`** y el RPC ya la escribe
  para las diferencias por upgrade
  ([20260709000000...sql:225-240](../../../supabase/migrations/20260709000000_daily_expiration_end_of_day_ar.sql#L225-L240)).
  **No hace falta cambio de schema**, solo un `CREATE OR REPLACE` de la función:
  el INSERT del pago normal (Caso D,
  [:247-260](../../../supabase/migrations/20260709000000_daily_expiration_end_of_day_ar.sql#L247-L260))
  no incluye `notes`, y la firma no tiene un parámetro para recibirla
  ([:23-34](../../../supabase/migrations/20260709000000_daily_expiration_end_of_day_ar.sql#L23-L34)).
- El `select` de `getActiveMemberships()`
  ([client.ts:140](../../../src/membership/api/client.ts#L140)) tampoco trae
  `notes`; habría que agregarlo ahí y al tipo `ActiveMembership.last_payment`
  ([types.ts:13](../../../src/membership/types.ts#L13)).

**Por qué no se resolvió inferiendo el concepto desde el monto** (la única vía
sin migración): no existe historial de precios — `updateMembershipPrices()` pisa
los valores in-place sin versionar
([client.ts:261-266](../../../src/membership/api/client.ts#L261-L266)). Comparar
el monto de un pago contra los precios *actuales* funciona solo mientras no se
actualicen los precios; después deja de matchear, o peor, etiqueta mal (con
inflación, el `middle_amount` de hoy puede coincidir con el `amount` de hace un
año). Una heurística que miente sobre plata es peor que una etiqueta genérica.

**Nota para quien lo retome:** persistir en `notes` **no es retroactivo**. Los
pagos existentes quedan con `notes` NULL y seguirían mostrando "Monto", así que
la UI necesita un fallback y convivirán dos etiquetas hasta que roten todos los
pagos.

## Bug latente detectado, fuera de alcance

`getActiveMemberships()` ordena los pagos solo por `payment_date`
([client.ts:138-156](../../../src/membership/api/client.ts#L138-L156)) y se
queda con el primero como `last_payment`. Cuando hay un `charge_diff`, el RPC
inserta **una fila extra con el mismo `payment_date`** que la principal (ambas
usan `p_start_date`). Sin desempate, cuál de las dos gana es **no
determinístico**: Ingresos puede terminar mostrando el monto de la diferencia
por upgrade en vez del pago real. Se arregla agregando `created_at` como
desempate en el `order`, sin tocar la base — pero excede el alcance de este
cambio.

## Plan

### Pasos

1. Rama `fix/membership-charge-mode` desde `develop`.
2. `membership-form.tsx`: eliminar `shouldApplyMiddleAmount`,
   `shouldSuggestSurcharge` y el estado `applySurcharge`; introducir
   `chargeMode` con default `'full'` y reset por cambio de tipo.
3. `membership-form.tsx`: fusionar `displayAmount` + `actualAmount` en
   `chargeAmount` como fuente única del hidden input y del input visible.
4. `membership-form.tsx`: reemplazar el switch de recargo por el selector de
   modalidad (radios nativos, precios visibles), con hint de recargo no
   vinculante.
5. i18n: agregar `chargeMode*` y `surchargeHint`; eliminar `aplySurcharge`,
   `middlePriceApplied` y `surchargeApplied` en `es.json` y `en.json`.
6. `npm run type-check` y `npm run lint`.
7. ADR + checklist de pruebas locales.
