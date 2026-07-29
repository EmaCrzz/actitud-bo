# Unificar rango mensual en timezone AR entre /incomes y /stats/accounting

**Fecha:** 2026-07-29
**Autor:** emanuel@getlenk.com
**Rama:** feat/incomes-dashboard

## Descripción

El total de ingresos del mes no coincidía entre `/incomes` (hero "Cobrado") y `/stats/accounting` (card Ingresos). Consultaban la misma tabla pero con estrategias de rango distintas:

- `/incomes` (`getIncomesCobrado` → `fetchMonthTotal` en [incomes.ts](../../src/accounting/api/incomes.ts)) construía el rango `[start, end)` con `utcInstantAtAppTzWallClock` — timezone-aware, medianoche AR convertida a instante UTC — y filtraba con `.gte(startIso).lt(endIso)`.
- `/stats/accounting` (`getMonthlyStats` en [server.ts](../../src/accounting/api/server.ts)) construía strings crudos `"${month}-01"` y `"${month}-31"`, y filtraba con `.gte(startStr).lte(endStr)`. Postgres casteaba los strings a `timestamptz` como medianoche UTC.

Las dos diferencias concretas eran:

1. **Se perdían ~27 h del final del mes en `/stats`.** `<= "YYYY-MM-31"` ≡ `<= 2026-07-31 00:00 UTC` ≡ `<= 2026-07-30 21:00 AR`. Todo pago hecho el 31 (día completo) y el 30 después de las 21 h AR quedaba fuera.
2. **Se colaban ~3 h del mes anterior en `/stats`.** `>= "YYYY-MM-01"` ≡ `>= 2026-07-01 00:00 UTC` ≡ `>= 2026-06-30 21:00 AR`. Pagos del 30 de junio entre 21 h y 24 h AR entraban a julio.
3. **Meses con < 31 días.** `"2026-04-31"`, `"2026-02-31"` son fechas inválidas y Postgres las rechazaba o interpretaba de forma inconsistente.

Neto: `/stats/accounting` mostraba menos que `/incomes` sistemáticamente, y la brecha se agrandaba con pagos concentrados a fin de mes — la política de cobro de Actitud (recargo desde el 11, media membresía desde el 16) genera exactamente ese patrón.

Bug relacionado y latente: la agrupación por `payment_date.substring(0, 7)` derivaba el `monthKey` del ISO UTC. Un pago del 31 a las 22 h AR cae en el mes siguiente en UTC y quedaba en un segundo elemento del array; el `.sort` descendente lo ponía primero y la UI (`stats?.[0]`) mostraba ese mes equivocado como si fuera el consultado.

## Decisiones

### Decisiones de negocio

- El total del hero en `/incomes` y el de la card en `/stats/accounting` deben ser idénticos para un mismo mes consultado — son la misma métrica en dos vistas.

### Decisiones técnicas

- **Extraer el helper de rango a `lib/timezone.ts`.** Ya existía `getMonthRangeInAppTz(now)` para el mes actual; agregué `getMonthRangeFromKey(monthKey)` como companion parametrizado por `"YYYY-MM"`. `incomes.ts` tenía una copia local privada que ahora usa la del lib.
- **Rango half-open `[start, end)` sobre instantes UTC** derivados de medianoche AR — mismo patrón que ya usa `/incomes` y el resto de queries del dominio. Elimina el problema del "-31" hardcodeado y el error de un día completo en el borde.
- **Fijar el `monthKey` de agregación al parámetro `month`** en `getMonthlyStats`, en vez de derivarlo del ISO UTC de cada fila. Como la consulta es siempre de un solo mes, la agrupación por-mes-derivado-del-ISO era código muerto y peligroso. Ahora se devuelve un único elemento con la key del mes AR consultado.
- **Extender el fix a `getMembershipPayments` y `getExpenses`** en `server.ts` que arrastraban el mismo patrón `${month}-01`/`${month}-31`. Sin esto, la card **Gastos** de `/stats/accounting` (ya arreglada) mostraría un total distinto del que se calcula sumando los items visibles en `/expenses` (que consume `getExpenses`) — el bug se movía de lugar, no desaparecía. Mismo argumento para `getMembershipPayments`, que alimenta la ruta `/api/accounting/payments`.

## Consideraciones de seguridad

No se identifican implicaciones de seguridad. El cambio es sobre el rango de fechas de queries ya protegidas por `requireAdmin()` y RLS de Supabase.

## Lecciones aprendidas

- Cualquier filtro por rango temporal en este proyecto tiene que salir de `lib/timezone.ts`. Las copias privadas de helpers de rango son un antipatrón que ya generó una divergencia (esta), y probablemente existan otras aún no reportadas.
- El patrón `substring(0, 7)` sobre `payment_date` para derivar `YYYY-MM` es incorrecto en cualquier lado del código — el ISO viene en UTC y la key semántica del negocio es AR. Si aparece en otro archivo, se convierte con `getAppTzDateParts` o se toma directamente del parámetro consultado.

## Plan

### Pasos

1. Agregar `getMonthRangeFromKey(monthKey)` a `lib/timezone.ts` como companion de `getMonthRangeInAppTz`.
2. Refactorizar `incomes.ts` para consumir el helper compartido y eliminar la copia local.
3. Refactorizar `getMonthlyStats`, `getMembershipPayments` y `getExpenses` en `server.ts` para usar el helper y filtro half-open.
4. Simplificar la agregación de `getMonthlyStats` a un único elemento con `month` = key consultada.
5. Verificar type-check y lint.
