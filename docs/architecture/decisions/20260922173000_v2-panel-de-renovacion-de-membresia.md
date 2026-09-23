# Panel de renovación de membresía (v2, Fase 8 — UI)

**Fecha:** 2026-09-22
**Autor:** emanuel@getlenk.com
**Rama:** feat/v2-renovar-membresia

## Descripción

La Fase 8 entregó sus fundaciones en producción con **v0.13.0/v0.13.1**: política de cobro unificada en el día 11, recargo explícito (`surcharge_amount` + `surcharge_note`), número de comprobante (`receipt_number`) y el fix de renovación anticipada. Lo que faltaba era **toda la UI**.

Este PR construye el panel de renovación con su entrada desde el perfil del cliente: `SidePanel` de 2 pasos —"Nueva membresía" y "Confirmar"— con la ficha del cliente anclada arriba, sugerencia de precio con el motivo a la vista, descuento y recargo editables, resumen con el desglose que cierra, y dialog de éxito con el número de comprobante.

El comprobante compartible (`PaymentReceipt`) y la entrada desde el home quedan para un PR siguiente.

**El diseño se verificó contra capturas del 2026-09-22**, no contra el árbol de nodos: la cuota del MCP de Figma (6 llamadas **por mes** en un seat View del plan Professional) se agotó en la segunda llamada de esta sesión. Esas capturas trajeron un cambio respecto de lo que el plan tenía anotado: **el paso 1 ahora incluye los dos datepickers**, `Fecha de inicio` y `Fecha de vencimiento`, que antes no estaban.

## Decisiones

### Decisiones de negocio

- **El período se prefija derivado, con los dos datepickers visibles y editables.** El inicio es `max(hoy, vencimiento vigente + 1 día)` y el fin, el fin de ese mes. Renovar antes del vencimiento no puede arrancar el período nuevo hoy: eso le come al cliente los días que ya pagó. Es el caso que la migración `20260922125530` habilitó del lado de la base, y la UI tenía que proponerlo bien. El Figma dibuja los dos campos, así que se muestran los dos; lo derivado es el valor inicial, no la libertad de cambiarlo.

- **Renovar el último día del mes propone el mes siguiente completo** (del 1 a fin de mes) en vez de "hoy → fin de mes", que dejaría un período de un solo día. Un día de gimnasio no es una membresía mensual — para eso está el pase diario — y además `basicMembershipValidation` rechaza inicio = fin, así que el panel se abriría bloqueado un día de cada mes. Se descartó estirar el fin al mes siguiente dejando el inicio en hoy: 30/04 → 31/05 son 31 días y el validador topea el período en un mes desde el inicio.

- **La sugerencia de precio se preselecciona, no sólo se ofrece.** Modalidad de cobro, recargo y descuento arrancan en la opción que la política propone, **con el motivo visible**, y el operador puede bajarlos a "sin" o a un monto libre. Es la regla que Ema fijó el 2026-09-21: *"sugerir el monto pero no ser una regla 100% obligatoria"*. Nada queda deshabilitado ni validado contra la sugerencia.

- **La fecha que decide la sugerencia es el inicio del período, no `new Date()`.** Es el falso positivo más caro del flow: pagar octubre el 28 de septiembre cae en la franja de recargo del calendario, y con la fecha de hoy se le sugeriría mora a alguien que está pagando por adelantado. Verificado: con inicio 2026-10-01 la sugerencia no propone recargo aunque se cargue el 22/09.

- **Descuento y Recargo son selects con salida a monto libre.** El Figma los dibuja como selects; la decisión #5 pide poder editar. La opción `Otro monto…` reconcilia las dos: las opciones con concepto se ofrecen primero y el monto libre existe pero hay que ir a buscarlo. No es estética — el desglose de Ingresos y Balance se apoya en que cada peso tenga un concepto detrás (`discount_rule_id`, `surcharge_note`), y un campo de monto vacío por default invita a cargar plata sin decir de qué es.

- **Cambiar el tipo de plan sobre un pago ya comprobado avisa y deja continuar.** Cuando el `start_date` cae el mismo día calendario AR que el inicio del período vigente, el RPC hace UPDATE del pago existente conservándole el `receipt_number`: si además cambió el plan, esa fila queda con otro monto bajo el mismo número y un comprobante ya entregado deja de coincidir. Se descartó bloquear el cambio (le saca al operador una capacidad que v1 tiene) y anular-y-reemitir (requiere modelar el pago anulado: migración y ADR propios).

  **El aviso aparece en los dos pasos.** En el paso 1 es reactivo, junto al select de tipo: explica la consecuencia en el momento de la decisión, y desaparece solo si el operador corre la fecha de inicio hacia adelante. En el paso 2 se repite arriba del footer, porque el resumen es lo último que se lee antes de confirmar y el cambio de tipo pudo haber ocurrido varios campos atrás.

  **La condición es angosta a propósito.** No alcanza con "cliente activo + cambio de plan": esa es la renovación normal de alguien que pasa de 3 a 5 días el mes que viene, el caso más frecuente que existe, y avisar ahí convertiría el recuadro en ruido. Tiene que haber colisión de período — o sea, una corrección sobre un cobro ya emitido.

- **El paso 1 muestra el período vigente pago** (`Período vigente pago: 03/09/2026 – 30/09/2026`). Apareció al intentar verificar el aviso de arriba: la condición exige que el inicio elegido caiga **el mismo día** que el inicio del período vigente, y ese día no estaba en ninguna pantalla de la app — el Perfil muestra "30 días restantes", no la fecha. El operador elegía a ciegas y el aviso era, en la práctica, inalcanzable. Es información útil por sí misma: renovar es continuar un período, y hay que ver desde dónde.

- **Cambiar de plan resetea el recargo a "sin recargo".** La sugerencia anterior se calculó con los precios del plan viejo; re-aplicarla en silencio bajo un monto nuevo es peor que hacer que el operador la vuelva a elegir. La opción sigue en el select, con el monto del plan nuevo y su motivo.

### Decisiones técnicas

- **`src/membership/renewal.ts` concentra toda la aritmética** de fechas y montos, sin React ni Supabase. `resolveRenewalAmounts()` es el **único** lugar donde se calcula plata: lo leen el resumen del paso 2 y el `FormData` que sale hacia el RPC. Con un solo cálculo, lo que el operador confirma y lo que se guarda no pueden diferir — que es exactamente el defecto #3 del Figma, donde el resumen muestra tres números que no cierran.

- **`getApplicableDiscountForCustomer` se extrajo a `src/group/discount.ts`.** El panel es un client component y no puede importar `group/api/server.ts`, que arranca con el `createClient()` del server. La alternativa era reescribir las tres consultas y la aritmética del monto en `api/client.ts`: dos copias de la regla que decide cuánta plata se le descuenta a alguien, listas para divergir. La lógica quedó parametrizada por el cliente de Supabase y los dos módulos de API la envuelven.

- **`computeDiscountAmount()` se separó del resolver** para romper un ciclo: la query del descuento necesitaba el bruto, el bruto salía del formulario y el formulario esperaba a la query. Ahora la regla se consulta una vez por apertura y el monto se recalcula en memoria cuando cambia el plan o la modalidad. Sin esto habría un round trip por click para rehacer una multiplicación, y el monto mostrado quedaría un render atrasado respecto del total.

- **`fetchRenewalContext()` trae los cuatro datos que ningún fetch existente daba:** plan vigente, vencimiento, inicio del período (vía `getMembershipPeriodStart`, la misma resolución `start_date ?? last_payment_date` que hace el RPC) y si el cliente registró asistencias en el mes contable. Este último es input **obligatorio** de `getSuggestedCharge()` y se resuelve con un `count` de `head: true`, sin traer filas.

- **El formulario no se renderiza hasta que las tres consultas respondieron.** El `DatePicker` de v2 es no controlado y sólo lee su `defaultValue` al montar, así que un prefill que llegue después no se vería; y las sugerencias tienen que estar preelegidas desde el primer render, o cambiarían la pantalla bajo el operador mientras la está leyendo.

- **`membership_amount` se manda como bruto + recargo, sin el descuento.** `upsertCustomerMembership` deriva `gross = membership_amount − surcharge` y después `net = gross + surcharge − descuento`. Mandarle el total ya neteado restaría el descuento dos veces. Es el mismo contrato que usa el form de v1.

- **Se reusa `upsertCustomerMembership` en vez de tocar el RPC.** Ya mapea los 16 parámetros y traduce sus códigos de error; la fase no necesitó una función de escritura nueva.

- **`CustomerFormField` subió a `src/components/v2/FormField.tsx`.** Su propio docblock anotaba que se mudaba cuando lo consumiera un segundo dominio; el panel de renovación vive en `membership/` y arma los mismos campos. Es la regla de extracción del ADR de la fase 1.

- **`InputCurrency` de v2** (`src/components/v2/ui/InputCurrency.tsx`), por los mismos cuatro motivos que ya hicieron propios al Button, Input, Select y DatePicker: el de v1 mide ~50px contra los 36 de la fila de v2, usa `text-base`, va en `rounded-[4px]` y arrastra un `mb-[20px]` que descuadra el `gap`. Se comparte el motor (`react-currency-input-field`, ya dependencia), no el componente.

- **`ConfirmDialog` acepta `showCancel={false}`.** El dialog de éxito no tiene nada que cancelar: la operación ya ocurrió, y dos botones que cierran lo mismo son una elección falsa. Volverá a dos cuando el segundo sea `Compartir`.

- **Descuento y Recargo van apilados, no en dos columnas como los dibuja el Figma.** Cada uno crece al elegir "Otro monto…" —aparecen el campo de moneda y el de motivo— y en columnas eso deja un hueco del alto de dos campos al lado del que no se abrió.

- **El `DatePicker` de v2 pasa `defaultMonth` al calendario.** `DayPicker` abría siempre en el mes de hoy aunque el campo tuviera otra fecha: un vencimiento en 31/10 mostraba septiembre y había que navegar a mano. `selected` sólo pinta el día, no mueve la vista. **Es un bug preexistente de la Fase 7** que este panel hizo evidente, porque acá el prefill cae rutinariamente en un mes distinto del actual — toda renovación anticipada.

### Divergencias deliberadas contra el Figma

Documentadas en el código, para pasarle al diseñador:

1. **No se ofrece "Sin membresía"**; el select arranca con el plan vigente. El diseño lo muestra como default al renovar a alguien con 5 días activos (defecto #5), que es lo contrario de lo que el operador necesita. Misma decisión que la Fase 7.
2. **Promociones queda deshabilitado en "Sin promoción".** `discount_rules.applies_to` admite `'promo'` desde `20260722120000`, pero no hay ninguna regla cargada ni CRUD que las cree — eso es la Fase 14. Se muestra deshabilitado en vez de ocultarlo porque el resumen del propio diseño ya imprime "Sin promoción".
3. **`Membresía` en el resumen muestra el nombre del plan, no un monto** (defecto #6): en el diseño la misma palabra significa un monto en el resumen y el plan en el comprobante.
4. **`Modalidad de cobro` lleva el precio base que realmente se cobra** (defectos #3 y #4), de modo que `base − descuento + recargo = Total` se verifica leyendo la tabla.
5. **`Recargo`, no `Recargo por mora`**, en el resumen: la mora es sólo uno de los motivos posibles, y con "Otro monto…" el operador puede cargar un recargo que no lo es.
6. **El comprobante llevará `receipt_number`**, que el diseño no dibuja. Un comprobante sin número no es trazable, que es justo para lo que se agregó la columna.
7. **`Periodo` muestra el nombre del mes sólo cuando el período es un mes calendario completo**; si no, el rango. Con los dos datepickers editables, 15/08 → 14/09 no es "Agosto".

## Auditoría de timezone

Cada fecha que nace o viaja en esta fase, call site por call site:

| Call site | Qué pasa | Helper |
|---|---|---|
| `buildRenewalPeriod` — "hoy" | Día calendario AR, no `toISOString().slice(0,10)` | `getTodayIsoDateInAppTz(now)` |
| `buildRenewalPeriod` — vencimiento vigente | `expiration_date` es timestamptz; su día se lee en AR antes de sumarle 1 | `getAppTzDateParts` + `shiftIsoDateInAppTz` |
| `buildRenewalPeriod` — fin de mes | Fin del mes calendario AR del inicio | `getEndOfMonthIsoDateInAppTz(parseAppTzDateString(...))` |
| `getSuggestedCharge({ date })` | El día del mes decide si hay recargo: se parsea el "YYYY-MM-DD" como medianoche AR | `parseAppTzDateString` |
| `isSameAppTzDay` (aviso de cambio de tipo) | Mismo criterio que el `v_same_period` del RPC (`AT TIME ZONE ... ::date`) | `getAppTzDateParts` |
| `resolveStatus` (badge de la ficha) | Vencida por día calendario AR, no por instante | `isExpiredInAppTz` |
| `start_date` / `end_date` → RPC | Canonicalizados por `upsertCustomerMembership`, que ya lo hacía | `isoDateToAppTzTimestamp` |
| Pase diario | Inicio y fin = hoy AR | `resolveRenewalPeriod` → `getTodayIsoDateInAppTz` |

**Ningún string crudo del datepicker llega a supabase-js.** El valor viaja como día calendario "YYYY-MM-DD" de punta a punta y se convierte a instante en un solo lugar, el que ya existía.

## Consideraciones de seguridad

- **Autenticación / Autorización:** sin cambios en quién accede a qué. VIP sigue filtrado a admins en el select, con la misma limitación ya anotada en la Fase 7 — `upsert_customer_with_membership` no valida el rol, así que el filtro es client-side. Esta fase no lo empeora: el RPC de pago sí valida, y es el único que este panel usa. `fetchRenewalContext` consulta `membership_payments` para prefijar la forma de pago; esa tabla es admin-only por RLS, y para un no-admin la consulta devuelve vacío y el select arranca sin preselección — degradación, no error.
- **Exposición de datos:** ninguna nueva. Los tres fetches leen tablas que el usuario ya podía leer, con las mismas policies.
- **Validación de input:** los montos pasan por `resolveRenewalAmounts`, que clampea en 0 y no admite negativos; el total no es tipeable. La validación de la nota obligatoria del descuento ad-hoc se delega a `basicMembershipValidation`, que ya la tenía, y la respalda el RPC (`DISCOUNT_NOTE_REQUIRED`) y el CHECK de la tabla. El único chequeo propio es `total > 0`, que el validador compartido no puede hacer porque el total lo arma este panel.
- **Dependencias:** ninguna nueva. `react-currency-input-field` ya era dependencia.
- **Infraestructura:** sin cambios. **Ninguna migración** — la fase trabaja contra el schema que ya está en producción.

## Lecciones aprendidas

- **`membership_amount` no es el total.** Es bruto + recargo, sin descuento, y `upsertCustomerMembership` netea después. Pasarle el total —que es lo intuitivo— restaba el descuento dos veces y cobraba de menos sin que ningún CHECK lo frenara: el desglose cerraba, sólo que con el número equivocado. El nombre del campo no ayuda.

- **El prefill derivado choca con el validador en días puntuales.** "hoy → fin de mes" deja inicio = fin el último día del mes, y "hoy → fin del mes siguiente" excede el tope de un mes en los meses de 30 días. Ninguno de los dos se ve probando un martes cualquiera. Se verificó con un barrido de los 730 días de 2026 y 2028 (bisiesto) contra `basicMembershipValidation`, en los dos escenarios —cliente vencido y renovación anticipada—: **0 fallos**.

- **Una condición correcta puede ser inalcanzable.** El aviso de cambio de tipo estaba bien implementado y bien cableado, y aun así no había forma de verlo: exige que el inicio elegido coincida exactamente con el inicio del período vigente, un día que la app no mostraba en ninguna parte. La lógica no tenía nada malo; lo que faltaba era el dato en pantalla. Se descubrió recién al probar el flow con datos reales — leyendo el código, el aviso "andaba".

- **La cuota del MCP de Figma es de 6 llamadas por mes, y ya estaba casi agotada.** La primera llamada de la sesión devolvió la sección entera a 4096px de ancho —siete pantallas de 1280, ilegibles— y la segunda, pidiendo resolución natural, dio rate limit. Las capturas las terminó pasando Ema a mano, como en las fases 5, 6b y 7. Sigue vigente lo que el plan ya anota: subir el seat de View a Full en el team "Federico" lo lleva de 6/mes a 200/día.

- **La rama de trabajo estaba 4 commits detrás de `develop`** y le faltaba justamente el fix de renovación anticipada, que es la base de la regla de fechas de esta fase. `git log develop..rama` salía vacío —no tenía commits propios— pero eso no dice nada sobre lo que le falta. El chequeo correcto es `git log rama..develop`.

## Plan

### Pasos

1. Poner la rama al día con `develop` (estaba 4 commits atrás).
2. Extraer `resolveApplicableDiscount` y `computeDiscountAmount` a `src/group/discount.ts`; `api/server.ts` y `api/client.ts` pasan a envolverlos.
3. Agregar `fetchRenewalContext()` a `membership/api/client.ts`.
4. Escribir `src/membership/renewal.ts` — estado, período, montos y etiqueta de período, todo puro.
5. Subir `CustomerFormField` a `components/v2/FormField.tsx`; crear el átomo `InputCurrency` de v2.
6. Construir `AmountChoiceField`, `RenewMembershipStep`, `RenewSummaryStep` y `RenewMembershipPanel`.
7. Traducciones `v2.membership.renew.*` en `es.json` y `en.json`.
8. Enganchar el botón `Renovar` del footer del perfil, reemplazando el panel en vez de apilarlo.
9. Verificar: `type-check`, `lint` (0 warnings nuevos), `build`, y el barrido de fechas contra el validador.

### Fuera de alcance

- **`PaymentReceipt` y la entrada desde el home** — PR siguiente de la fase.
- **La forma del dialog de éxito.** El Figma lo dibuja centrado, con el check verde en círculo sobre el título y los botones `Cancelar` + `Compartir`; hoy es el `ConfirmDialog` estándar, alineado a la izquierda y con una sola acción. Se rehace junto con `Compartir`, que es la otra mitad de esa pantalla: el dialog **es** la superficie desde la que se comparte el comprobante, y tocarlo dos veces no tiene sentido.
- **Issue [#59](https://github.com/EmaCrzz/actitud-bo/issues/59)** (`payment_date` recibe el inicio del período). Toca 287 filas históricas y cambia números que alguien ya mira: PR y ADR propios. El comprobante lo va a esquivar leyendo `created_at`, que ya guarda el momento real del cobro — que es lo que el diseño pide mostrar (`Fecha: 10/08/2026` sobre un período de agosto).
- **`POST /api/accounting/payments`**, roto y sin llamadores. Sigue anotado, sin tocar.
