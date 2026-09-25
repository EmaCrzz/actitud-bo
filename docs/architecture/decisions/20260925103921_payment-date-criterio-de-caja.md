# `payment_date` pasa a ser cuándo entró la plata (criterio de caja)

**Fecha:** 2026-09-25
**Autor:** emanuel@getlenk.com
**Rama:** fix/payment-date-criterio-de-caja

## Descripción

Cierra el issue [#59](https://github.com/EmaCrzz/actitud-bo/issues/59), detectado el 2026-09-21 mientras se probaba la Fase 8: los clientes recién cobrados no aparecían en "Últimos pagos" de `/incomes`. La UI no mostraba nada roto — la lista tenía sus cinco pagos, todos correctos.

`upsert_customer_membership_with_payment` escribía `payment_date = p_start_date`, que es la fecha que el operador elige en el **datepicker de inicio del período**, no el momento en que se cobró. Un solo valor alimentando dos conceptos distintos. Es el mismo defecto que tenía `customer_membership.last_payment_date` y que la Fase 7 resolvió **a medias**: agregó `customer_membership.start_date` para separar "cuándo arranca el período" de "cuándo se cobró", pero `membership_payments` quedó sin el equivalente.

Esta migración agrega ese equivalente —`period_start`— y le devuelve a `payment_date` su significado.

**Toca 291 filas de producción y mueve totales que alguien ya mira.** Por eso va en PR y ADR propios, separada de la Fase 8.

## Medición previa

El plan exigía medir antes de tocar nada, en dev **y** en prod. Se midió el 2026-09-25 sobre las dos, con `created_at` como referencia del momento real del cobro.

| | Prod | Dev |
|---|---|---|
| Pagos totales | 291 | 291 |
| Filas sin `created_at` | 0 | 0 |
| Filas con la fecha desfasada | 73 (promedio 7,2 días, máximo 46) | 73 |
| Filas que cambian de **mes contable** | 8 | 8 (las mismas) |

Dev es un restore reciente de prod y quedó idéntico salvo $1.000 en septiembre (ruido de las pruebas de v2), así que el ensayo de la migración en dev es representativo.

**Totales por mes en prod, antes → después:**

| Mes | Antes | Después | Δ |
|---|---|---|---|
| 2025-09 | $16.000 | $16.000 | 0 |
| 2026-06 | $78.000 | **$0** | −$78.000 |
| 2026-07 | $1.623.850 | $1.660.850 | +$37.000 |
| 2026-08 | $1.893.400 | $1.934.400 | +$41.000 |
| 2026-09 | $2.167.500 | $2.167.500 | 0 |

**Fase del ciclo de cobro** (grace ≤ 10 / recargo ≥ 11), sobre el total histórico: **166/125 → 151/140**. Hoy clasifica por el día del *período* —casi siempre el 1— así que venía contando de más en "sin recargo".

### Que `created_at` sea el dato correcto no se asumió, se verificó

El backfill entero descansa sobre que `created_at` guarde el momento real del cobro. Tres pruebas independientes sobre prod:

- **Se reparte entre las 7 y las 21 hs AR**, con picos a las 10 y a las 20. Ninguna fila fuera del horario del gimnasio. Un restore o un backfill masivo estaría apelotonado en un instante.
- **218 de 291 pagos (75%) ya tienen las dos fechas en el mismo día**: se cobraron en el mostrador en el momento. En 3 de cada 4 filas las dos fechas coinciden por su cuenta, lo que confirma la equivalencia sin depender de ningún supuesto.
- **49 días distintos con carga, máximo 1 fila por segundo.** Cero señal de carga automatizada.

## Decisiones

### Decisiones de negocio

- **El mes contable es cuándo entró la plata — criterio de caja.** Decidido con Ema el 2026-09-23. Ingresos y Balance agrupan por el momento del cobro, no por el período al que corresponde la cuota. Es lo que cuadra contra la caja y el banco, lo que hace comparable el mes contra Gastos —que ya van por fecha de gasto— y lo que evita que un mes ya cerrado siga cambiando porque alguien pagó tarde. Hoy el dashboard hace lo contrario, por accidente.

- **Backfill puro, sin excepciones para el arranque.** Los 4 pagos de junio 2026 se cargaron en julio (entre 6 y 46 días después), así que junio queda en $0. Se consideró respetar el arranque con una fecha de corte y se descartó: la regla quedaría con una excepción permanente y **no hay separador limpio** entre "carga tardía" y "pago tardío" — julio tiene desfases de hasta 46 días que sí son pagos tardíos legítimos y deben moverse. Junio tenía 4 pagos contra 89 de julio: la app recién arrancaba y esos 4 son backlog. Confirmado con Ema el 2026-09-25: junio y julio están cerrados, la plata no se pierde sino que se reatribuye al mes en que se registró.

- **Dos preguntas quedan del lado del período, no de la caja.** "¿Quién pagó la cuota de este mes?" y "¿quién falta?" no son preguntas sobre plata sino sobre cobranza: alguien que pagó octubre el 28 de septiembre está al día en octubre, aunque su plata haya entrado en septiembre. `getBillingCycleProgress` y `getPendingCustomers` agrupan por `period_start`; todo el resto agrupa por `payment_date`.

- **Nadie puede estar en mora antes de que su período empiece.** El corte grace/recargo pasó de "día del mes ≤ 10" a "antes de que termine el día 10 **del mes del período**, o el día en que el período arranca si es posterior". Corrige dos conteos: la renovación anticipada (pagar octubre el 28/09 daba día 28 = mora) y el alta de mitad de mes (entrar el 15 y pagar el 15 daba día 15 = mora, cuando paga media membresía, que es un eje distinto del recargo). El segundo venía mal **desde antes** del #59.

### Decisiones técnicas

- **Columna nueva en vez de leer `customer_membership.start_date`.** El issue dejaba las dos opciones abiertas. Se eligió la columna porque `customer_membership` guarda **el período vigente**, uno solo por cliente: un pago histórico no tiene dónde leer el suyo, y el join daría el período actual para todas las filas de ese cliente. Un pago es un hecho inmutable y su período es parte del hecho.

- **`period_start` es NOT NULL.** Una fila sin período desaparecería del ciclo de cobro sin que nada falle — exactamente el tipo de error silencioso que este issue vino a arreglar. El RPC no puede escribir NULL: usa `COALESCE(p_start_date, v_paid_at)` en los dos INSERT, así que el camino `charge_diff` —que puede llegar sin `p_start_date`— tampoco rompe.

- **El orden del backfill importa y está en una sola migración.** Primero `period_start = payment_date` (preserva), recién después `payment_date = created_at` (corrige). Invertirlo destruiría el dato. Al estar en la misma transacción, o pasan las dos o no pasa ninguna.

- **Reversible por diseño.** El valor viejo de `payment_date` queda en `period_start`. Volver atrás es `UPDATE membership_payments SET payment_date = period_start`, no un restore desde un dump. Fue lo que permitió decidir el backfill puro sin red de seguridad adicional.

- **El `UPDATE` de corrección no toca `payment_date`.** Esa rama es una corrección de un cobro que ya ocurrió: la plata entró cuando se creó la fila, y moverla a hoy sacaría de su mes un ingreso ya contabilizado sólo porque alguien corrigió un monto. El doble submit —el caso que motivó el camino idempotente en la migración `20260707113341`— ocurre en el mismo instante, así que ahí tampoco hay diferencia.

- **`payment_date` abandona el invariante de medianoche AR**, que había puesto la migración `20260729144614`. A propósito: ya no representa un día elegido en un datepicker sino un instante en que ocurrió algo. Ninguna UI muestra la hora (`formatDate` y `relativeDateLabel` resuelven el día en AR), así que el único efecto visible es el orden — "Últimos pagos" ordena por `payment_date DESC` y los cobros del mismo día empataban en medianoche, saliendo en orden arbitrario. El invariante sigue vigente para `period_start`, que sí es una fecha de datepicker.

- **`next_receipt_number(v_paid_at)` en vez de `(p_start_date)`.** El número de comprobante lleva el año de la fecha que recibe. Una renovación hecha el 28/12 para un período de enero estaba consumiendo numeración del año siguiente. Verificado: un período de enero 2027 cobrado hoy saca `2026-00001`.

- **`v_paid_at := now()` con nombre.** `now()` en Postgres es `transaction_timestamp()`, así que ya devolvía el mismo instante en las siete llamadas sueltas que tenía la función: **no cambia ningún comportamiento**. Lo que cambia es que se lee qué significa ese instante.

- **Sin índice sobre `period_start`.** La tabla tiene 291 filas y `payment_date` tampoco tiene uno. Cuando alguna de las dos lo necesite, van juntas.

- **Un bloque de comentario al tope de `incomes.ts` declara qué fecha usa cada consulta.** Ocho funciones consultan esa tabla y la diferencia entre las dos columnas es invisible en el call site — es exactamente la clase de distinción que se pierde en el próximo cambio si no está escrita donde se lee.

## Auditoría de timezone

Obligatoria en este repo, y acá es el corazón del cambio.

| Call site | Qué pasa | Helper |
|---|---|---|
| `payment_date` escrito por el RPC | `now()` — un instante real, no una fecha de calendario. No necesita canonicalización: no viene de un datepicker | — |
| `period_start` escrito por el RPC | `p_start_date`, que el caller ya canonicaliza con `parseAppTzDateString` antes de enviarlo | (ya existente) |
| Backfill `payment_date = created_at` | Copia entre columnas `timestamptz`. No hay parseo de strings, así que no hay ventana para el bug de las 3 horas | — |
| Comparaciones de mes en la medición | `AT TIME ZONE 'America/Argentina/Buenos_Aires'` en cada agregación | — |
| `getCyclePhaseForPayment` | Construye el vencimiento de la gracia como medianoche AR del día 11 del mes del período | `utcInstantAtAppTzWallClock` |
| Filtros de `period_start` en incomes | Mismo `getMonthRangeFromKey` que ya usaban con `payment_date` | (ya existente) |

**Ningún string de datepicker nuevo llega a la DB en este cambio.** El único valor nuevo que se escribe es `now()`.

## Consideraciones de seguridad

- **Autenticación / Autorización:** sin cambios. El RPC sigue siendo `SECURITY DEFINER` con la misma firma de 16 parámetros y el mismo chequeo de admin para VIP. `membership_payments` sigue siendo admin-only por RLS (migración `20260702120000`); la columna nueva hereda las policies de la tabla.
- **Exposición de datos:** ninguna. `period_start` no es dato nuevo — es el valor que `payment_date` ya exponía a los mismos lectores.
- **Validación de input:** ninguna entrada nueva. `period_start` no viene del usuario: sale de `p_start_date`, que el RPC ya usaba para escribir `customer_membership.start_date`.
- **Dependencias:** ninguna nueva.
- **Infraestructura:** una migración, aditiva. `ALTER TABLE ADD COLUMN` + dos `UPDATE` + `SET NOT NULL` sobre 291 filas: el ensayo completo tardó 430 ms.

## Lecciones aprendidas

- **El `UPDATE` del backfill tocó 291 filas, no las 73 que esperaba.** El `WHERE payment_date IS DISTINCT FROM created_at` compara instantes, y `payment_date` era medianoche AR mientras `created_at` trae la hora real: **todas** difieren. Correcto, pero el comentario que había escrito decía "acota a las 73" y el ensayo lo desmintió antes de que llegara a ser documentación equivocada. Vale la pena mirar el conteo que devuelve un backfill aunque la migración no falle.

- **Arreglar una métrica rota destapa que estaba rota de dos formas.** Al hacer que la fase grace/recargo leyera el cobro real en vez del inicio del período, apareció que el alta de mitad de mes venía contándose como morosa **desde antes** — el defecto estaba tapado por el otro. Un número que nadie podía verificar no acumula un error, acumula varios.

- **La medición cambió la decisión, no sólo la confirmó.** El plan decía "medir antes", y lo que la medición trajo no fue un número para el ADR sino una pregunta de negocio que no estaba en el issue: junio 2026 se vacía. Sin ese paso, el PR habría dejado un mes en $0 sin que nadie lo hubiera decidido.

- **Verificar el supuesto del backfill, no sólo el backfill.** Todo el cambio descansa en que `created_at` sea el momento del cobro. Es plausible y resultó cierto, pero era comprobable: la distribución horaria y el 75% de filas donde las dos fechas ya coinciden lo demuestran sin depender de la palabra de nadie. Si `created_at` hubiera sido producto de un restore, la migración habría inventado fechas con total confianza.

## Plan

### Pasos

1. Medir en prod y en dev: filas desfasadas, filas que cambian de mes, totales antes/después, y sanidad de `created_at`. ✅
2. Migración `20260925103921`: columna, backfill en orden, `SET NOT NULL`, comentarios, y `CREATE OR REPLACE` del RPC. ✅
3. `getCyclePhaseForPayment()` en `billing-policy.ts`. ✅
4. `incomes.ts`: `getBillingCycleProgress` y `getPendingCustomers` a `period_start`; el resto queda en `payment_date` con el criterio declarado. ✅
5. Comentar los lectores de los otros dominios (balance, listado de pagos, ingresos del día, último pago del cliente). ✅
6. Tipos y `shemema.txt`. ✅
7. Verificar: ensayo de la migración, RPC end-to-end contra dev en transacción con rollback, barrido del helper de fase, `type-check`, `lint`, `build`. ✅

### Verificación ejecutada

- **Ensayo de la migración** (`rehearse-migrations.sh dev`): aplica limpio contra los datos reales, `ROLLBACK`, 430 ms.
- **RPC end-to-end contra dev**, dentro de `BEGIN … ROLLBACK` — cuatro caminos:
  - Cobro nuevo → `period_start` = octubre, `payment_date` = hoy, igual a `created_at`, comprobante asignado.
  - Corrección del mismo período → `payment_date` y comprobante intactos, monto actualizado.
  - Renovación anticipada → dos filas, dos comprobantes, mismo día de cobro, períodos distintos.
  - Período de enero 2027 cobrado hoy → comprobante `2026-00001`, el año del cobro.
- **Barrido de `getCyclePhaseForPayment`**: 19 casos (renovación normal, anticipada, alta de mitad de mes, día 31 donde `día + 1` desborda el mes, cruce de año, febrero bisiesto) + el corte exacto entre el 10 a las 23:59 y el 11 a las 00:00 en los 12 meses. 0 fallas.

### Orden de despliegue

**Migración primero.** Es aditiva y retrocompatible: el código viejo sigue leyendo `payment_date`, que después de la migración dice la verdad en vez de mentir. Nada en producción lee `period_start` hasta que salga este PR.

### Lo que queda fuera, y sigue anotado

- **`POST /api/accounting/payments`**, roto y sin llamadores. Ahora le faltan **dos** columnas NOT NULL (`gross_amount` y `period_start`), no una. No se completó acá a propósito: el arreglo es una decisión —completar el desglose o borrar el endpoint— y mezclarla con un cambio de fechas la escondería. Anotado en el tipo y en el PLAN.
- **`last_payment_date` sigue recibiendo la fecha de inicio** en las altas sin cobro. Es el mismo defecto de origen, en la otra tabla, y la limpieza es migrar los lectores restantes a `getMembershipPeriodStart()`.
- **B5 (DNI sin UNIQUE)**, que sigue necesitando criterio caso por caso sobre 8 pares duplicados en prod.
