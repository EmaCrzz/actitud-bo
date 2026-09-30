# Sección Gastos de v2 y el medio de pago de un gasto

- **Fecha:** 2026-09-30
- **Estado:** aceptada
- **Fase:** 11 del [plan v2](../../v2/PLAN.md)
- **Rama:** `feat/v2-gastos`
- **Migración:** `20260929104500_expenses_payment_method.sql` (aditiva, va a prod antes del release)

## Contexto

La sección Gastos del rediseño muestra tres KPIs —**Total de gastos / Efectivo /
Transferencias**—, un filtro `Método` y un campo "Forma de pago" en el
formulario. Nada de eso se podía sostener: `expenses` guardaba descripción,
monto, categoría y fecha, y no sabía cómo se había pagado. Es la "brecha B1" y
la [decisión #8](../../v2/PLAN.md#decisiones-abiertas--riesgos) del plan.

El CRUD ya existía completo en v1 (`src/accounting/api/server.ts` + rutas HTTP
en `/api/accounting/expenses`), con la canonicalización de `expense_date`
resuelta desde el ADR [20260729150049](20260729150049_expenses-timezone-canonicalization.md).
Lo que faltaba era la columna, la pantalla y los filtros.

## Decisiones

### 1. `payment_method` es nullable y no se backfillea

La decisión #8 preguntaba si los gastos históricos se asumen en efectivo o
quedan "sin especificar". **Se midió antes de responder**, y la medición volvió
chica la pregunta: en producción hay **29 gastos**, entre el 2026-07-10 y el
2026-09-25. No es un histórico, es el arranque del módulo.

Además, adivinar salía caro justo donde más pesa: los tres alquileres suman
**$1.200.000** y los tres sueldos **$399.000**. Los montos más grandes son los
que menos se pagan en efectivo, así que un backfill a `PAYMENT_CASH` habría
metido ~$1,6M de datos inventados en el lado de egresos del balance.

Apareció un segundo motivo, independiente y más fuerte: **`expenses` tiene un
escritor que no es la UI**. El RPC `upsert_customer_membership_with_payment`
inserta una fila de categoría `REFUNDS` cuando un cambio de plan genera un
reintegro, y no recibe ni puede deducir el medio de pago. Con `NOT NULL` esa
inserción fallaría; con `NOT NULL DEFAULT 'PAYMENT_CASH'` **cada reintegro
futuro quedaría etiquetado como efectivo sin que nadie lo haya decidido**.

Consecuencia visible: `Efectivo + Transferencias` **no suma** `Total de
gastos`. En vez de dejar tres números que no cierran, la pantalla muestra una
línea con cuánta plata quedó sin clasificar. El descuadre se explica en vez de
quedar mudo.

### 2. Los KPIs describen el período; la tabla, la selección

**Corregido tras la revisión de Ema (2026-09-30).** La primera versión
calculaba los tres KPIs sobre las filas visibles, con el argumento de que
tenían que cuadrar con la tabla. El resultado era incoherente: **filtrando por
Efectivo, "Total de gastos" pasaba a mostrar el total en efectivo** — el mismo
número que el KPI de al lado — y afirmaba que en el mes se había gastado eso,
que es falso.

La regla correcta es la que sugiere el propio layout: los KPIs están **arriba**
de la barra de filtros porque hablan del período, no de la selección. Ahora se
calculan sobre todos los gastos del rango, ignorando método y búsqueda. Que no
cuadren con la tabla cuando hay un filtro activo es lo correcto: son dos
preguntas distintas.

Eso partió el filtrado en dos lugares, a propósito: **el rango se resuelve en
el server** (es lo que acota la consulta y define de qué período habla la
pantalla) y **método y búsqueda en memoria** (sólo eligen qué subconjunto se
lista). De paso, los dos que se resuelven en el cliente ya no necesitan un
round trip por tecla, así que se fueron el debounce y la navegación.

`summarizeExpenses` ([src/expenses/summary.ts](../../../src/expenses/summary.ts))
sigue siendo una función pura que recibe una lista: lo que cambió es **qué
lista** recibe. El export a CSV sí exporta lo visible, que es lo que el
operador espera de un botón que dice "Exportar" con filtros puestos.

### 3. El "Sin especificar" se agrega al filtro aunque el diseño no lo tenga

Las capturas listan sólo Efectivo y Transferencia en el dropdown `Método`. Se
agregó una tercera opción: sin ella los 29 gastos históricos y los reintegros
del RPC no se pueden aislar, y son justamente los que alguien querría encontrar
para clasificarlos. Es el mismo criterio que el campo Estado de la Fase 10 —
el diseño omite un estado que el modelo sí tiene.

Filtra por **ausencia**, no por un valor, así que la comparación obvia —`===`
contra la clave— nunca matchearía nada y el filtro se vería andar devolviendo
siempre vacío. Tiene su propio test.

### 4. Los filtros viven en la URL

Los tres, para que la vista sea compartible y recargable — igual que en
Clientes. Pero **sólo el rango navega**: método y búsqueda se sincronizan con
`history.replaceState`, sin volver a ejecutar el server component, porque no
cambian qué filas existen. Mismo patrón que el listado de clientes.

El default del rango es el mes en curso, calculado con `getMonthRangeInAppTz` y
no con `new Date()`: el server corre en UTC y el día 1 a medianoche AR caería
en el mes anterior.

### 5. Redirect y no degradación para los no-admin

`expenses` tiene RLS admin-only en las cuatro operaciones desde
`20260702120000`. Sin guard, un no-admin vería la sección vacía —PostgREST
devuelve cero filas, no un error— y leería "Aún no se registraron gastos".
Se resolvió con `requireAdminOrRedirect()` en el layout, igual que v1, porque
la sección entera es admin y no hay nada que degradar. (Hoy los 4 usuarios de
prod son admin: es preventivo.)

### 6. Se reusa el CRUD existente

No se escribió un `api/client.ts` nuevo: la lectura va por `getExpenses` desde
el server component y las mutaciones por las rutas HTTP que ya usa v1. A
`getExpenses` se le agregó sólo el rango de fechas; el resto quedó igual, así
que v1 sigue llamándola sin cambios.

## Divergencias con el diseño, decididas explícitamente

| Captura | Qué se implementó | Por qué |
|---|---|---|
| `Busca por nombre o apellido` | "Busca por descripción" | Copy heredado de Clientes; un gasto no tiene nombre ni apellido |
| KPI "Total cobrado" (mobile) | "Total de gastos" | Copy heredado de Ventas; ya estaba anotado en el plan |
| `Sin gastos registrados` con la tabla llena | "N gastos registrados" | Ruido de maqueta |
| `1 de 4 páginas` con la página 2 marcada | El número real | Ídem |
| "Registra un nuevo gasto" en el panel de **edición** | "Modificá los datos del gasto registrado" | Dice que estás creando cuando estás editando |
| `Forma de pago: Email` en el select | Efectivo / Transferencia | Placeholder de librería |

La búsqueda va **sólo contra `description`**: `category` guarda la clave
(`SERVICES`), no la etiqueta, así que buscar ahí no encontraría "servicios" y
sí encontraría cosas por motivos inexplicables.

## Lo que se encontró de paso

### Un bug que bloqueaba el alta de cliente un día de cada mes

La suite e2e falló en 8 specs que no tienen nada que ver con gastos. La causa
no era la Fase 11 ni el plan nuevo que había en dev: **el 2026-09-30 es el
último día del mes**, y el alta de cliente prellenaba "inicio = hoy,
vencimiento = fin de mes" → las dos fechas iguales →
`basicMembershipValidation` rechaza el formulario. **El alta de v2 quedaba
bloqueada el último día de cada mes**, sin forma de guardar salvo corrigiendo
las fechas a mano.

El panel de renovación de la Fase 8 ya resolvía exactamente esto con
`buildRenewalPeriod` —propone el mes siguiente completo— y su docblock explica
la regla con detalle. El alta simplemente no la usaba. Se arregló reusando esa
función en vez de repetir la regla: son la misma decisión de negocio y tienen
que moverse juntas.

**La regla estaba documentada y nunca verificada:** `buildRenewalPeriod` no
tenía un solo unit test. Se le escribieron 8, validados por mutación —sacar la
guarda del último día del mes pone 4 en rojo—, porque ahora sostiene dos flows.

### Tres specs propios que se mentían solos

El spec de borrado pasó por dos falsos negativos antes de ser correcto, los dos
por la misma causa: **Radix marca con `aria-hidden` todo lo que queda de fondo,
y `getByRole` respeta el árbol de accesibilidad**.

1. Con el panel abierto, `toHaveCount(0)` sobre una celda da 0 **al instante**,
   sin que se haya borrado nada.
2. Esperar a que "el panel cierre" tampoco sirve: con el diálogo de
   confirmación abierto, el heading del propio panel ya cuenta como oculto.

En los dos casos el assert pasaba antes de que el request terminara (~900ms) y
la lectura contra la DB encontraba la fila viva. **El borrado nunca estuvo
roto** — se verificó aparte contra la ruta real con curl. La versión final
espera la respuesta HTTP del DELETE, que es la única señal que significa lo que
el test necesita saber, y busca la fila con un locator de CSS, inmune al
`aria-hidden`.

Es la segunda fase seguida en la que un spec propio resulta un falso positivo
por asumir que "no lo encuentro" equivale a "no está".

## Alternativas descartadas

- **Backfillear a efectivo.** Ver decisión 1: inventa ~$1,6M y rompe el camino
  de los reintegros.
- **Agregar filtro por categoría.** El diseño no lo tiene; la categoría es
  columna, no filtro. Se respetó.
- **Export en el server.** Son decenas de filas: un CSV en el browser no
  necesita ruta ni dependencia nueva, y sale de los mismos datos que la
  pantalla muestra.
- **Panel separado para alta y edición.** Las capturas muestran los mismos
  cinco campos en el mismo orden; lo único que cambia es el pie. Dos
  componentes sería garantizar que diverjan en algo que nadie decidió.

## Lo que cambió después de la revisión de Ema

Además del cambio de los KPIs (decisión 2), la primera pasada dejó dos defectos
de interacción y uno los compartía con una pantalla ya entregada:

**El chevron `›` del final de la fila no abría la fila.** Se pasaba como
`rowActions`, y esa celda **frena la propagación del click** a propósito: en el
sandbox `rowActions` es un menú desplegable, y abrirlo no debe disparar además
el `onRowClick`. Con un chevron decorativo esa protección lo convertía en la
única zona muerta de la fila — justo donde el operador apunta para abrirla.
`DataTable` tiene ahora un prop `rowChevron` aparte, que renderiza el chevron
en una celda que sí propaga. **Membresías tenía exactamente el mismo defecto**
desde la Fase 10 y quedó arreglado con el mismo cambio.

**Las últimas filas quedaban debajo del corte, sin scroll.** Clientes y
Asistencias envuelven su tabla en `flex-1 md:min-h-0 md:overflow-y-auto`, que
le da al listado una ventana de scroll propia dejando filtros y paginador
anclados; Gastos y Membresías no lo hacían. En Membresías estaba latente —con
seis planes nunca desborda— y se arregló igual.

**Orden por fecha en el header.** No está en el diseño; lo pidió Ema. Es la
única columna donde el orden significa algo para quien revisa los gastos del
mes. `DataTableColumn` acepta un `sort` opcional y el header pasa a ser un
botón con `aria-sort`; sólo desktop, porque en mobile no hay headers.

**Tres arreglos de mobile, uno de ellos en el AppShell.** Con los importes
reales —6 y 7 cifras— los tres KPIs a `text-2xl` no entraban en el ancho de un
teléfono: el número salía como `$ 3.253…` y el label como `Total de ga…`. La
maqueta se ve bien porque usa importes de 7 caracteres a 389px. Ahora la
tipografía de mobile es la mitad y los labels envuelven en vez de truncarse.
Los dos datepickers del filtro, además, eran `w-full` sin `flex-1 min-w-0`
—que el dropdown sí tenía— y empujaban al `Método` fuera de la pantalla.

El tercero es del shell y **afecta a las siete pantallas**: el contenedor de
scroll era el `<main>` y el header su hermano de afuera, así que los 8px de
nuestro scrollbar —que no es overlay, lo fija `globals.css`— salían del ancho
del card y lo dejaban corrido respecto del header. Ahora scrollea la columna
que contiene a los dos, y el header queda `sticky` para no perder el hamburger
del menú al bajar. Compensarlo con un padding fijo de 8px no servía: con
scrollbars overlay el ancho reservado es 0 y el padding habría *creado* la
desalineación.

> **Este último no tiene verificación automática.** Se escribió un test que
> compara las cajas del header y del card, y **pasaba igual con el bug
> presente**: el Chromium de Playwright usa scrollbars overlay, así que ahí la
> desalineación no existe. Un test que no puede fallar es peor que ninguno, así
> que se descartó en vez de dejarlo en verde sin significado. Queda como
> verificación visual.

**Un bug propio que encontró su test.** `parseExpenseFilters` validaba las
fechas de la URL sólo por forma, con un regex. `2026-13-45` tiene la forma
correcta: pasaba el filtro, ordenaba después del fin de mes, disparaba el swap
de "rango invertido" y terminaba mandándole un mes 13 a Postgres. Ahora se
valida que el día exista, con un round trip por la TZ del negocio.

## Consecuencias

- Toda escritura nueva de gastos por la UI puede llevar medio de pago; la vieja
  y la del RPC quedan en "sin especificar" y se ven como tales.
- La Fase 13 (Balance) puede desglosar egresos por medio de pago, con la
  salvedad de que los 29 históricos no suman a ningún método.
- `toAppTzIsoDate` se subió a `src/lib/timezone.ts`: estaba duplicada en
  `RenewMembershipPanel` y en `e2e/support/dates.ts`, y esta fase iba a ser la
  tercera copia.
- `DatePicker` de v2 acepta `ariaLabel`, que hacía falta para distinguir los dos
  datepickers del rango.
- `DataTable` gana `rowChevron` y `sort` por columna. Los dos salieron de esta
  fase pero son transversales: la próxima tabla los hereda.
- **Deuda que queda anotada:** el `notes` de un gasto existe en la DB y ninguna
  de las dos UIs lo edita; y `deleteExpense` sigue siendo hard delete, que es
  consistente con la confirmación explícita del diseño pero no deja papelera.
