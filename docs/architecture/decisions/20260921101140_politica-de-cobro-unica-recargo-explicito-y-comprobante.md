# Política de cobro única, recargo explícito y número de comprobante

**Fecha:** 2026-09-21
**Autor:** emanuel@getlenk.com
**Rama:** feat/politica-de-cobro-y-recargo

## Descripción

Fundaciones de la **Fase 8** del plan v2 (renovar membresía + comprobante). No trae UI: prepara el modelo de datos y la lógica de precios que el flow de renovación va a consumir, y que además arregla dos incoherencias que ya estaban en producción.

El disparador fue una pregunta de Ema al revisar las capturas del rediseño: el formulario de renovación muestra `Descuento` y `Recargo` como campos propios, y él quería *"proponer un precio y que el usuario sea libre de editarlo. En caso de tener recargo la UI debería sugerirlo porque se cumplen las condiciones, sugerir el monto pero no ser una regla 100% obligatoria."*

Al ir a implementarlo aparecieron tres cosas que el plan daba por sabidas y estaban mal:

1. **No existe un "monto de recargo" en ninguna parte.** `types_memberships` guarda tres **precios totales** por plan (`amount`, `middle_amount`, `amount_surcharge`) y el operador elige uno con el select "Modalidad de cobro". El recargo nunca se guardó como concepto: un cobro con mora queda indistinguible de un plan que cuesta más. El comprobante del rediseño, en cambio, tiene `Recargo` como fila propia.

2. **El plan afirmaba que `billing-policy.ts` calcula el recargo automáticamente. No lo hace, y nadie lo llamaba desde el formulario.** Lo que el form de v1 usa es una heurística propia (`suggestsSurcharge`) que sugiere recargo desde el día **11** y sólo si el cliente ya registró asistencias este mes.

3. **Había tres reglas de día-del-mes conviviendo**, y dos de ellas en producción contradiciéndose: `ACTITUD_BILLING_POLICY` decía que el recargo empieza el **16**, y con ese corte el dashboard de ingresos clasificaba los pagos del mes y pintaba la barra del ciclo; el formulario sugería recargo desde el **11**; y el copy que el operador lee en pantalla (`membership.surchargeHint`) dice "pasó el día 10". O sea: **el dashboard contaba un pago del día 13 como "sin recargo" mientras el formulario ya venía sugiriendo cobrarlo con recargo.**

## Decisiones

### Decisiones de negocio

- **El corte del recargo es el día 11** (`gracePeriodEnd: 10`, `surchargeStart: 11`). Dos de las tres reglas ya apuntaban ahí —el formulario y el copy visible— así que se corrigió la constante y no las otras dos. Confirmado con Ema. **Efecto visible en v1:** los pagos de los días 11 a 15, históricos incluidos, pasan a contarse como "con recargo" en el dashboard de ingresos, y la barra del ciclo se pone amarilla cinco días antes. No se migra ningún dato: esa clasificación se calcula al leer.

- **El recargo se sugiere, nunca se impone.** Cuando se cumplen las condiciones, el formulario propone el monto configurado y explica el motivo; el operador puede editarlo o dejarlo en cero. No hay campo deshabilitado ni validación que lo fuerce. Es literalmente el pedido, y es también el motivo por el que `surcharge_note` quedó **opcional**: exigir una nota para desviarse de la sugerencia la convertiría en regla por la puerta de atrás.

- **Mora e ingreso a mitad de mes son cosas distintas, y el recargo sólo aplica a la primera.** Quien viene desde el día 3 y paga el 20 está en mora → recargo sobre el mes completo. Quien se suma el 20 no le debe nada a nadie → media membresía, sin recargo. La distinción la hace `hasAssistancesThisMonth`, que es el dato que la política no puede deducir sola. Estaba implícita en la condición del formulario de v1 y no estaba escrita en ningún lado; ahora es un `reason` explícito (`late_payment` / `mid_month_entry`) que la UI muestra.

- **El total del cobro se deriva, no se tipea.** Base, recargo y descuento son editables; el total es siempre `base + recargo − descuento`. Cualquier monto sigue siendo alcanzable, pero deja de ser posible un monto sin explicación — que es exactamente lo que descuadraría el desglose de ingresos y del Balance. Se consideró el total editable con la diferencia guardada como "ajuste": se descartó porque obliga a inventar un concepto contable nuevo que accounting tendría que aprender a leer, y porque el comprobante ya está diseñado con las cuatro filas separadas.

- **Cada pago lleva número de comprobante** (brecha B3), con secuencia por año. El diseño del comprobante **no** lo pide; se agregó igual porque un comprobante que el cliente recibe por WhatsApp y después menciona en un reclamo no se puede buscar. Los pagos históricos quedan sin número.

### Decisiones técnicas

- **`surcharge_amount` guarda el monto del recargo, no el precio con recargo.** La sugerencia se deriva de `amount_surcharge − amount`, pero lo que se persiste es lo que se cobró. Es la diferencia que hace que un comprobante viejo se pueda reimprimir sin recalcular contra los precios de hoy.

- **El CHECK de consistencia se extendió en vez de evitarse.** Pasó de `amount = gross_amount - discount_amount` a `amount = gross_amount + surcharge_amount - discount_amount`. La primera intención fue no poner CHECK "porque son columnas `real` y la igualdad exacta es riesgosa" — hasta ver que **ese CHECK ya existía desde la migración 20260722120000 y nunca falló**: los montos son pesos enteros, representables exactos en float4, y el RPC calcula el neto con las mismas tres columnas que guarda. Si algún día aparecen centavos, esto hay que pasarlo a `numeric`, no aflojarle la tolerancia.

- **Dos ejes en vez de tres opciones planas, sin romper v1.** `PeriodMode` (`full | half`) responde "qué porción del mes" y el monto de recargo responde "hay mora" — separados, porque el select de tres los mezclaba y hacía imposible "media membresía con recargo". `ChargeMode`, `getChargeModeOptions` y `getChargeAmount` quedan intactos: los consumen el formulario de v1 y el alta v2, y migrarlos es un cambio de UI que no pertenece a este PR.

- **La sugerencia vive en un módulo nuevo, `src/membership/pricing.ts`.** Cruza la política de fechas (`accounting/billing-policy.ts`) con el catálogo de precios (`membership/charge-mode.ts`), y ninguno de los dos debería importar al otro.

- **Contador por año en una tabla, no `CREATE SEQUENCE`.** La numeración reinicia cada año y una secuencia de Postgres no reinicia sola: haría falta crear una por año a mano cada 1 de enero, o un cron. Una fila por año con UPSERT atómico no tiene mantenimiento. El año sale de la **fecha del pago**, no de `now()`, para que un pago retroactivo cargado en enero pertenezca al ejercicio de diciembre — el mismo criterio con el que accounting agrupa.

- **El comprobante viaja en la respuesta del RPC.** La alternativa era leerlo después de `membership_payments`, que es admin-only por RLS (`20260702120000`), así que un operador no-admin se quedaría sin comprobante justo después de cobrar.

- **v1 también pasa a guardar el desglose separado.** El formulario de v1 no cambia para el operador —sigue eligiendo "mes con recargo" y viendo un precio único— pero manda el recargo en un campo oculto para que la fila quede igual que la que va a escribir v2. La alternativa era dejar que cada pantalla lo guarde a su manera, y entonces el desglose de ingresos dependería de cuál de las dos cobró.

- **DROP + CREATE del RPC, no un overload nuevo.** Postgres no permite agregar parámetros con `CREATE OR REPLACE`, y hacerlo de todos modos crea un overload. Este esquema ya pagó ese precio: dos overloads de esta misma función convivieron dos meses y rompieron el alta de cliente con un `PGRST203` durante ocho semanas sin síntoma visible. Se verificó que queda **una sola** entrada en `pg_proc`.

## Consideraciones de seguridad

- **Autenticación / Autorización:** sin cambios. El RPC sigue siendo `SECURITY DEFINER` con la misma guarda de admin para VIP, y `membership_payments` sigue admin-only por RLS. `receipt_counters` nace con RLS habilitada y **cero policies**, más un `REVOKE ALL` para `anon` y `authenticated`: sólo la función `SECURITY DEFINER` la toca. `next_receipt_number()` tiene `REVOKE ALL ... FROM PUBLIC` — si fuera invocable desde la API, cualquier usuario autenticado podría quemar numeración de comprobantes a voluntad, dejando huecos que parecen comprobantes perdidos.

- **Exposición de datos:** el número de comprobante viaja en la respuesta del RPC al cliente que acaba de cobrar. No revela nada de otros clientes, pero sí filtra el **volumen de cobros del año** (es un contador correlativo). Se consideró aceptable: es el mismo dato que cualquier comprobante impreso lleva encima, y quien cobra ya ve las métricas del negocio.

- **Validación de input:** el recargo se clampea en 0 (`GREATEST`) para que un recargo negativo no entre como descuento sin regla ni nota, saltándose el CHECK `adhoc_requires_note`. La consistencia del desglose se valida **antes** del insert y devuelve `AMOUNT_MATH_MISMATCH`, un error que la UI puede explicar, en vez del 23514 del CHECK.

- **Dependencias:** ninguna nueva.

- **Infraestructura:** ninguna. Una tabla y una función nuevas, ambas cerradas a la API.

## Lecciones aprendidas

- **Tres reglas de negocio pueden convivir años si ninguna se llama entre sí.** El corte del día del mes estaba escrito en tres lugares con dos valores distintos, y el que estaba mal era justo el que se veía en el dashboard. Nada falló nunca: el formulario sugería y el dashboard clasificaba, cada uno por su cuenta. **Cuando una regla de negocio existe en más de un archivo, verificar que el número sea el mismo antes de asumir cuál es la fuente de verdad** — acá la fuente resultó ser el copy de i18n, que es lo único que un humano estaba leyendo.

- **El plan del proyecto afirmaba que `billing-policy.ts` calculaba el recargo automáticamente. No lo hacía.** Sexto claim desactualizado que aparece al ejecutar una fase. Leer el módulo antes de diseñar sobre lo que el plan dice que hace.

- **La precaución equivocada sobre floats casi sacó una garantía que ya funcionaba.** La intuición "igualdad exacta sobre `real` es frágil" es correcta en general y acá habría empeorado el esquema: el CHECK existía, era exacto, y llevaba un año sin fallar. **Antes de evitar una técnica por principio, mirar si el repo ya la usa y cómo le fue.**

- **Un Postgres local desechable paga su costo de setup en el primer bug.** Se levantó un cluster con el schema real (sin FK, sin la vista, con un stub de `auth.uid()`) y se ejercitaron siete escenarios contra la función nueva: insert con desglose, idempotencia, desglose inconsistente, numeración por año, el CHECK rechazando escritura directa, la llamada de 14 parámetros del código en producción, y el conteo de overloads en `pg_proc`. Es lo que confirmó que `COALESCE` corta la evaluación y **no consume un número de comprobante al re-cobrar** — una cosa que ninguna lectura del SQL asegura.

- **El diseño del comprobante mezcla dos significados en la misma etiqueta.** En el resumen del paso 2, `Membresía` es un monto ($15.000); en el comprobante, `Membresía` es el nombre del plan ("5 días"). Anotado para el diseñador junto con los otros cinco defectos de las capturas.

## Plan

### Pasos

1. `billing-policy.ts`: corregir el corte a 10/11, agregar `halfMonthStart: 16` y `qualifiesForHalfMonth()`. Los consumidores (dashboard de ingresos, barra del ciclo) siguen la constante sin cambios de código.
2. `charge-mode.ts`: agregar el eje `PeriodMode` (`getPeriodModeOptions`, `getPeriodBaseAmount`, `getConfiguredSurcharge`) sin tocar `ChargeMode`.
3. `src/membership/pricing.ts` nuevo: `getSuggestedCharge()` y `computeChargeTotal()`.
4. Migración `20260921101140`: `surcharge_amount` / `surcharge_note` / `receipt_number`, CHECK extendido, `receipt_counters` + `next_receipt_number()`, y DROP + CREATE del RPC con los dos parámetros nuevos.
5. Propagar el desglose en los callers: `customer/api/client.ts` (renovación v1 y alta), el campo oculto de `membership-form.tsx`, y `CustomerFormPanel.tsx` (alta v2).
6. Tipos: `MembershipPayment` gana las tres columnas; `DISCOUNT_MATH_MISMATCH` pasa a `AMOUNT_MATH_MISMATCH`.
7. Verificación contra un Postgres local desechable con el schema real.

### Orden de deploy

**Migración primero, después el release** — el default documentado del proyecto para migraciones aditivas, y acá se cumple estrictamente:

- `surcharge_amount` nace `NOT NULL DEFAULT 0`; `surcharge_note` y `receipt_number` son nullable.
- El CHECK nuevo, con `surcharge_amount = 0`, es **literalmente** el CHECK viejo: ninguna fila existente lo viola y ninguna escritura del código actual lo viola.
- Los dos parámetros nuevos del RPC tienen `DEFAULT`, así que las llamadas de 14 argumentos con nombre que hace el código hoy en producción siguen resolviendo. **Verificado en el cluster local**, no asumido.
- El único cambio de comportamiento para el código viejo es que sus pagos nuevos reciben `receipt_number`. Es aditivo: nadie lo lee todavía.

Antes de `db:push-prod`: `./scripts/rehearse-migrations.sh prod` y `supabase/scripts/audit-integrity.sql`.

### Auditoría de timezone (obligatoria por fase)

| Call site nuevo | Fecha que maneja | Canonicalización |
|---|---|---|
| `getSuggestedCharge()` | día del mes que decide recargo y media membresía | Vía `getCyclePhaseForDate` / `qualifiesForHalfMonth`, que resuelven el día con `getAppTzDateParts`. **Ningún `getDate()` ni `getMonth()` crudo.** Es el punto de mayor riesgo del cambio: un desfase de 3 horas el día 10 a las 22hs sugeriría recargo un día antes. |
| `next_receipt_number(p_date)` | año del comprobante | `EXTRACT(YEAR FROM (p_date AT TIME ZONE 'America/Argentina/Buenos_Aires'))`. Sin esto, un pago del 31 de diciembre a las 22hs AR (01/01 03:00 UTC) tomaría número del año siguiente. |
| RPC — `payment_date` | fecha del pago | Sin cambios: sigue siendo `p_start_date`, que los callers canonicalizan con `isoDateToAppTzTimestamp`. |
| `client.ts` — desglose | — | No maneja fechas: sólo aritmética de montos. |

Lo que **no** cambió y conviene recordar para la UI de la Fase 8: el `date` de `getSuggestedCharge()` tiene que ser la fecha del cobro que el operador eligió en el datepicker, no `new Date()`, o un pago retroactivo recibiría la sugerencia de hoy.
