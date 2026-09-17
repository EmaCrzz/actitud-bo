# Perfil del cliente v2, paginación y orden por actividad real

**Fecha:** 2026-09-16
**Autor:** emanuel@getlenk.com
**Rama:** feat/v2-perfil-cliente

## Descripción

Cierra la **Fase 6b** del rediseño v2 (ver [docs/v2/PLAN.md](../../v2/PLAN.md)): el panel "Perfil del cliente" del listado de Clientes, con sus cuatro tabs.

La fase estaba bloqueada desde el 2026-09-16 porque la cuota del MCP de Figma (seat View) se agotaba en la primera llamada y las 8 pantallas de 6b nunca se pudieron inspeccionar. Se reintentó en esta sesión y devolvió el mismo rate limit — **la cuota no se renueva en el día**. Se destrabó con capturas que pasó Ema directamente.

Las capturas confirmaron el panel, y de paso destaparon **tres cosas que el plan daba por sabidas y estaban mal**. Dos de ellas obligan a corregir trabajo ya mergeado en la Fase 6a:

1. **El listado tiene paginación.** El Figma muestra `230 Total de clientes` a la izquierda y un paginador numerado (`‹ Anterior · 1 2 3 … · Siguiente ›`) a la derecha. La Fase 6a se construyó con scroll infinito y sin `count`, con la justificación explícita de que *"el Figma no muestra paginador ni contador"*. Lo muestra.
2. **El filtro `Estado` tiene cinco valores**, no dos: Activo · Por vencer · Vencido · Inactivos · De baja.
3. **El nodo `2118:22594` no es un menú de acciones de fila.** El plan lo tenía anotado así; es el dropdown del filtro `Estado` desplegado. No existe menú por fila: el chevron abre el perfil directamente.

## Decisiones

### Decisiones de negocio

- **"Inactivos" y "De baja" no se implementan, y se muestran deshabilitados.** Ninguno tiene respaldo en el schema (`customers` no tiene columna de estado) y no está definido qué los separa — si "inactivo" es derivado del comportamiento (sin asistencias hace N días) o un sinónimo de "de baja". Se consultó a Ema y quedó para definir. Se listan apagados en el dropdown: ocultarlos escondería una diferencia con el diseño, y filtrar por una regla inventada devolvería resultados falsos con cara de correctos.
- **"Por vencer" reusa la ventana de 7 días que ya existía** (`UPCOMING_EXPIRATION_WINDOW_DAYS`), en vez de definir un umbral nuevo. Es el mismo número que usa el badge del home, así que los dos lugares cuentan igual.
- **Los tres estados son mutuamente excluyentes.** Una membresía que vence en 3 días es "Por vencer", no "Activa". Si se solaparan, filtrar por "Activo" devolvería filas con el badge amarillo.
- **El precio del panel es el de lista del plan**, no el del último pago. Ver la sección de seguridad: leer el monto real dejaría la ficha sin precio para los no-admin.
- **"Renovar" hace toast de "próximamente".** El botón está en el footer de las cuatro vistas del Figma, pero renovar es el flow de la Fase 8.
- **Fechas de nacimiento y observaciones se agregan al schema ahora** (brechas B10 y B11), aunque el alta que las escribe sea la Fase 7. El tab "Info" las *muestra*: sin las columnas el tab queda incompleto contra el diseño.

- **El listado se ordena por actividad real, no alfabéticamente.** Al revisar la pantalla terminada apareció que el orden alfabético pone arriba a gente que no pisa el gimnasio hace años. Medido sobre dev (537 clientes): **223 (41%) nunca registraron una asistencia**, y de las primeras 20 filas alfabéticas **sólo 3 habían asistido en los últimos 30 días y 7 no habían asistido nunca**. La pantalla tenía 15% de señal.

  El criterio nuevo son **dos grupos, cada uno alfabético**: arriba los que asistieron en los últimos 30 días, debajo el resto. Con eso la primera página pasó a 20 de 20 filas con actividad reciente.

  - **El corte es por asistencia, no por estado de membresía.** Fue el requisito explícito de Ema: filtrar por "activos" perdería de vista a quien viene pero todavía no pagó — que son justamente los que hay que cobrar (39 personas en dev con asistencia este mes y sin membresía vigente). Y un cliente que no viene hace 290 días no importa aunque su membresía figure vigente.
  - **Es el mismo concepto de "señal de vida" que el proyecto ya tenía definido** en `getBillingCycleProgress` y `getExpiredMembershipsCount` para excluir "churn silencioso" de los KPIs. Nunca se había aplicado al listado. No se inventó un criterio: se extendió uno existente.
  - **Dentro de cada grupo se mantiene el alfabético** porque el listado también es un directorio — se busca gente por nombre — y ordenar por recencia lo haría impredecible. Se descartó la recencia pura por eso.
  - **La ventana es de 30 días rodantes, no el mes calendario.** La definición canónica del proyecto usa mes en curso, que sirve para un KPI mensual pero no para ordenar: el 1° de cada mes el listado entero colapsaría a un solo grupo.

### Decisiones técnicas

- **Paginación server-side con `count: 'exact'`**, reemplazando el scroll infinito en el listado v2. La alternativa era arrastrar la divergencia y corregirla más tarde, pero las fases 10–14 construyen sus tablas sobre el mismo `DataTable`: cada semana que pasa multiplica el re-trabajo.
- **El scroll infinito no se elimina.** `fetchCustomersPageWith` sigue siendo page-based y ahora devuelve `{ customers, total }`; el listado **v1** (`customer/list.tsx`) lo sigue consumiendo con `useInfiniteQuery` acumulando páginas. Los dos modos conviven sobre el mismo query canónico, que era el pedido explícito de Ema: paginar Clientes sin perder la capacidad para otras secciones.
- **`DataTablePagination` nace en `src/components/v2/`**, no dentro de Clientes. El pie de tabla se repite en Membresías, Gastos, Ventas y Configuración; la regla de extracción del proyecto pide dos consumidores, pero acá el Figma ya muestra los otros.
- **El estado derivado vive en una sola función.** `getCustomerMembershipStatus` (en `customer/utils.ts`) replica exactamente los tres cortes que aplica el `WHERE`, y el umbral sale de la misma constante. Antes el badge tenía su propia lógica inline con dos ramas; con tres estados y un umbral, dos copias se desincronizan solas.
- **`UPCOMING_EXPIRATION_WINDOW_DAYS` se mudó de `home/consts.ts` a `membership/consts.ts`** y se borró el archivo, que quedaba vacío. Pasó a tener dos dominios consumidores; que Clientes importara de Home habría sido un acoplamiento sin sentido.
- **Átomo `Tabs` nuevo en `components/v2/ui/`.** El `Tabs` de `components/ui/` es la variante *pill* de shadcn (`bg-muted`, `rounded-lg`, trigger activo con fondo y sombra); el Figma dibuja tabs con subrayado. Cuarto caso de la misma regla, después de `Button`, `Input` y `Select`.
- **Un solo endpoint nuevo: `fetchCustomerAssistances`.** El dominio sabía consultar asistencias por fecha o de la semana en curso, nunca el historial de una persona. Los pagos **no** necesitaron endpoint: `/api/accounting/payments?customer_id=` ya existía y se reusó.
- **El panel recibe la fila entera, no sólo el id.** El listado ya tiene nombre y membresía, así que la identidad se pinta en el primer frame y el fetch sólo completa el resto.
- **La lista de tabs es `sticky`, no va en el slot `pinned` del `SidePanel`.** `pinned` dibuja su propio `border-b` y el Figma no tiene línea entre el nombre y los tabs; además Radix necesita `TabsList` y `TabsContent` bajo la misma raíz.
- **El chevron es un `<button>` real**, no sólo un ícono decorativo dentro de una fila clickeable. Un `<tr onClick>` no se alcanza con teclado; así el perfil se abre con Tab + Enter.
- **La página vive en la URL** (`?page=`, 1-indexed), igual que los filtros. `customerFiltersToQueryString` la escribe sólo a partir de la segunda, para que el link del card del home siga generando exactamente la misma URL.
- **`customers.last_assistance_date` denormalizada por trigger, no agregado por consulta.** Ordenar por `max(assistance.assistance_date)` exigiría agregar 11k+ filas en cada carga de página. El **costo de escritura es cero**: `trigger_increment_assistance` ya hacía `UPDATE customers ... WHERE id = NEW.customer_id` para `assistance_count`; sumar una columna al `SET` de ese mismo UPDATE no agrega ninguna escritura. `assistance_count` ya era el precedente del patrón en el schema.

  Esto pesa por el **tier gratuito de Supabase**, que es donde vive el proyecto: las alternativas (vista con agregado, RPC que joinea y agrupa) gastan CPU compartida en cada request, mientras que ésta gasta una sola vez al insertar la asistencia. La base ocupa 25 MB de los 500 MB del plan y la columna suma ~4 KB.
- **Una vista `customers_listing` para el flag de orden.** El corte "reciente" depende de `now()`, así que no puede ser una columna generada — Postgres las exige inmutables. La vista lo calcula al leer: una comparación por fila sobre una columna indexada, sin joins ni agregados.
  - **`security_invoker = true` es obligatorio**, no cosmético. Sin él la vista correría con los permisos de su dueño y saltearía las policies RLS de `customers`, exponiendo las 537 filas a cualquier autenticado. Ver la sección de seguridad: se verificó empíricamente.
  - **Es la primera vista del proyecto** (había cero en `public`), así que antes de wirearla se verificó contra la API real que PostgREST pudiera **embeber `customer_membership` desde la vista**, incluido el `!inner` que usan los filtros. Era el riesgo del diseño: si la relación no resolvía, había que caer a un RPC.
- **El orden cambia también para el listado v1**, porque los dos consumen el mismo query canónico. Se decidió así en vez de parametrizar: dos órdenes distintos sobre una función compartida es la clase de divergencia que se pudre sola, y el criterio mejora la v1 por las mismas razones. Es reversible con un parámetro si Ema prefiere dejar v1 intacta.

## Consideraciones de seguridad

El tab de Pagos toca datos de finanzas, así que esta sección importa más que de costumbre.

- **Autenticación / Autorización:** `membership_payments` es **admin-only a nivel RLS** desde la migración `20260702120000_finances_admin_only_rls`, que agregó defensa en profundidad al RBAC de finanzas. Durante el diseño se acordó que el tab de Pagos lo viera todo el panel; al implementar apareció esa migración. **No se tocó la RLS**: revertir una restricción de seguridad deliberada y documentada es una decisión que excede esta fase. El tab se construyó para degradar de forma honesta — el rol se resuelve en el server (`isAdmin()`) y baja como prop, y un no-admin ve "Sólo un administrador puede ver el historial de pagos" en vez de una lista vacía. Queda anotado en el plan para que Ema decida con el dato completo.
- **Exposición de datos:** el panel sólo lee tablas a las que el usuario ya tenía acceso por RLS, y el único dato que se suma a la superficie (`notes`) es texto interno del staff sobre el cliente, en la misma tabla y con las mismas policies que el resto de `customers`.

  **La vista sí es superficie nueva y se trató como tal.** Una vista en Postgres 15+ corre por default con los permisos de su dueño, lo que la convertiría en un bypass de RLS sobre `customers` — todas las filas legibles por cualquier autenticado. Se creó con `security_invoker = true` y **se verificó contra la API real**: un `GET /rest/v1/customers_listing` con la anon key devuelve `[]`, no las 537 filas. Si el flag no estuviera aplicado, ese request habría filtrado la base entera.
- **Funciones:** `increment_assistance_count()` sigue siendo `SECURITY DEFINER`, como ya era. No se amplió lo que hace más allá de escribir una columna más en la misma fila que ya actualizaba, y no toma input del usuario: `NEW.customer_id` y `NEW.assistance_date` vienen de la fila insertada, que a su vez pasó por las policies de `assistance`.
- **Validación de input:** `?page=` se parsea con la misma tolerancia que los filtros — cualquier valor inválido cae en la primera página en vez de romper. El `.or()` del filtro de vencidas interpola un ISO generado por la app, no input del usuario.
- **Dependencias:** ninguna nueva. La barra de progreso son dos `div` en vez de agregar un primitive de progress.
- **Infraestructura:** la migración es aditiva (dos columnas nullable, sin default, sin backfill). No cambia permisos ni superficie de red, y se puede aplicar antes o después del release sin ventana de riesgo.

## Lecciones aprendidas

- **El árbol de nodos del Figma no alcanza, y esta vez el precio fue re-trabajo.** La Fase 6a ya había aprendido que no sirve para definir columnas ni microcopy. Ahora sabemos que tampoco sirve para **detectar controles completos**: un paginador y tres valores de un dropdown no aparecen en la jerarquía de capas. La regla del plan debería fortalecerse de "pedir la captura antes de definir columnas" a "pedir la captura antes de definir la pantalla".
- **Cuarto y quinto claim desactualizado del plan.** El plan anotaba un `MembershipTranslationShort` creado en 6a que no existe (lo que existe es `MembershipTranslationWeekly`, con otro propósito), y describía `2118:22594` como menú de acciones de fila cuando es el filtro de Estado. Es el mismo patrón que ya se registró en las fases 4 y 6a: **el documento fija como hecho cosas no verificadas**. Vale chequear cada claim del plan al ejecutarlo, no al escribirlo.
- **La cuota del MCP de Figma no se renueva en el día.** Reintentar al día siguiente no es una estrategia. O se sube el seat, o los frames se exportan a mano.
- **`birth_date` es el caso de manual de la regla de timezone.** Es una columna `date`, así que Supabase devuelve `"YYYY-MM-DD"` pelado; pasarla directo a `formatDate` la parsea como medianoche **UTC** y en Argentina muestra el día anterior. Un nacimiento del 12/03 se vería 11/03. Va por `parseAppTzDateString` como cualquier otra fecha del proyecto.
- **El badge "Pagada" del Figma no es un estado.** `membership_payments` no tiene columna de situación: toda fila de esa tabla *es* un pago hecho. Se implementó como etiqueta fija; si algún día hay pagos pendientes, va a necesitar modelo.
- **El diseño puede estar bien y la pantalla estar mal igual.** El listado cumplía el Figma al pie de la letra y aun así era casi inútil: el wireframe muestra ocho filas de ejemplo, todas activas, así que el problema del orden es literalmente invisible en el diseño. Sólo apareció al mirar la pantalla con los 537 clientes reales. **Vale mirar cada pantalla nueva con data de verdad antes de darla por cerrada**, no sólo compararla contra el frame.
- **El proyecto ya tenía el concepto y nadie lo había conectado.** "Señal de vida" estaba definido, comentado y en uso desde hacía meses — en los KPIs de accounting y del home — para exactamente este problema ("churn silencioso"). Antes de diseñar un criterio nuevo conviene buscar si el dominio ya nombró el problema en otro lado.

## Plan

### Pasos

1. Migración aditiva: `customers.birth_date` (`date`) y `customers.notes` (`text`), ambas nullable (brechas B10 y B11).
2. Capa de datos: `count: 'exact'` + estado `expiring` en el query canónico; `{ customers, total }` como forma de retorno; actualizar los dos wrappers y los dos consumidores v1.
3. `getCustomerMembershipStatus` como fuente única del estado derivado, compartida por badge y filtro.
4. Endpoint nuevo `fetchCustomerAssistances` (historial por cliente + contadores). Pagos: reusar `/api/accounting/payments`.
5. Átomo `Tabs` (subrayado) y compuesto `DataTablePagination`.
6. Panel `CustomerProfilePanel` + los cuatro tabs.
7. Wiring: chevron y fila abren el panel; filtros con tres estados reales y dos deshabilitados; paginador en el pie; `?page=` en la URL.
8. Verificación: `type-check`, `lint` (22 warnings / 0 errores, baseline de `develop`), `build`, e inspección offline de las URLs de PostgREST.
9. *(Agregado tras revisar la pantalla con data real)* Orden por actividad: columna `last_assistance_date` + backfill + trigger extendido + índice + vista `customers_listing`, y `order=is_recently_active.desc,first_name.asc`.

### Verificación del ordenamiento

Todo contra la base de dev, no sólo compilando:

| Qué | Cómo | Resultado |
|---|---|---|
| El backfill quedó bien | Primera página con el orden nuevo | 20/20 filas con asistencia reciente, alfabéticas (antes: 3/20) |
| El trigger mantiene la fecha | INSERT de asistencia dentro de una transacción | `assistance_count` +1, fecha seteada, `is_recently_active` en `true` |
| No pisa fechas nuevas con retroactivas | INSERT con `assistance_date` de hace 400 días | `GREATEST` conservó la más nueva |
| No se ensuciaron datos | `ROLLBACK` + recuento | 11.328 filas, igual que antes |
| PostgREST embebe desde la vista | `GET` con `customer_membership(...)` y con `!inner` | HTTP 200 en ambos |
| La vista no saltea RLS | `GET` con anon key | `[]`, no las 537 filas |

### Verificación de timezone

Auditoría call-site por call-site, según exige el plan:

| Call site | Fecha que toca | Helper |
|---|---|---|
| `getStatusBoundaries` (corte hoy / ventana) | `expiration_date` en el `WHERE` | `getTodayRangeInAppTz` + `UPCOMING_EXPIRATION_WINDOW_DAYS` sobre `setUTCDate` |
| `getCustomerMembershipStatus` (badge) | `expiration_date` | `isExpiredInAppTz` · `daysUntilInAppTz` |
| `getPeriodProgress` (barra) | `expiration_date`, `last_payment_date` | `daysUntilInAppTz` con `now` explícito |
| `fetchCustomerAssistances` (contador del mes) | `assistance_date` | `getMonthRangeInAppTz` |
| `formatBirthDate` (tab Info) | `birth_date` (`date` pelado) | `parseAppTzDateString` |

**La fase no escribe ninguna fecha en la DB** — es toda lectura. El riesgo es de corte: que el cambio de estado ocurra a las 21hs en vez de a medianoche AR. Las URLs generadas se verificaron offline y los límites caen en `T03:00:00.000Z`, que es medianoche de Argentina.

### Fuera de alcance

- **Mobile sin verificar.** Faltan los frames `2222:42619` y `2228:47961`. El paginador degrada por criterio propio (números ocultos, queda `Anterior/Siguiente` + "Página X de Y"), pendiente de contrastar.
- **Brecha B12 (`customer_membership.start_date`).** No se agregó: quedaría NULL para todo el histórico, así que la barra de progreso necesita el fallback a `last_payment_date` igual. Queda en la Fase 7, que es quien la escribe.
- **Editar el cliente desde el perfil.** El footer del Figma sólo tiene `Cancelar` y `Renovar`; el tab Info es de sólo lectura.
