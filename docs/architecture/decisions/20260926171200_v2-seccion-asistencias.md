# Sección Asistencias de v2 — tabs derivados de la URL y lista con hora

**Fecha:** 2026-09-26
**Autor:** emanuel@getlenk.com
**Rama:** feat/v2-asistencias

## Descripción

Fase 9 del [plan de v2](../../v2/PLAN.md): reemplaza el `UnderConstruction` de `/v2/attendance` por la sección real — lista de asistencias de un día, navegación entre días y, en desktop, tabs *Registro diario* / *Historial*.

Es la primera fase que el plan describía como "mayormente port de UI, sin brechas de DB". Lo primero resultó cierto; lo segundo, sólo a medias: no hace falta ninguna migración, pero sí extender un `select` que no traía un dato que el diseño muestra.

**El plan la tenía marcada como bloqueada por una pregunta de diseño que resultó mal planteada.** Decía que desktop tenía `Tabs` y mobile no, y pedía decidir si la divergencia era intencional. El árbol de nodos de Figma —única fuente disponible mientras la cuota del MCP sigue agotada— efectivamente lista un `Tabs` en los frames desktop, pero no dice qué dice ni qué hace. Las capturas que pasó Ema mostraron que sí, la divergencia existe y es deliberada, y que los tabs se llaman *Registro diario* y *Historial*.

Es la tercera vez que una inferencia del árbol de nodos resulta falsa: antes fueron el "dropdown de acciones de fila" de la fase 6b —que era el filtro `Estado`— y la premisa de la decisión #5 sobre el recargo. **El árbol dice qué instancias hay, no qué hacen.**

## Decisiones

### Decisiones de negocio

- **Desktop lleva tabs; mobile no.** Se construye lo que dibujó el diseñador, y no la simplificación de unificar los dos viewports sin tabs. El razonamiento: con los tabs, la vista por defecto —hoy, que es casi todo el uso— no muestra ningún control de fecha, y el navegador aparece sólo cuando el operador entra a buscar otro día. En 390px, en cambio, sumar una barra de tabs sobre la flecha, el título y el navegador es demasiada cáscara para una lista; ahí el navegador solo alcanza, y "Hoy" es su estado inicial.

- **El tab Historial tope en ayer.** El diseño no lo resuelve: la maqueta de Historial abre en "Ayer", pero nada dice qué pasa si el operador navega hacia adelante. Si llegara a hoy, vería exactamente la misma lista que el tab *Registro diario*, con el tab equivocado subrayado. Se descartó permitirlo y corregir el tab activo después: es más estado del que el problema necesita. "Historial" son los días pasados; hoy tiene su propio tab.

- **La ventana sigue siendo de 14 días hacia atrás**, igual que la pantalla de v1. Es un límite de producto y no técnico —la consulta es por rango de un día y cuesta lo mismo para cualquier fecha—, así que se portó tal cual en vez de reabrirlo en esta fase.

- **Paginación de 10 por página y buscador por nombre, ninguno de los dos en el Figma.** Pedidos por Ema durante la implementación. El diseño dibuja la lista completa sin controles, lo que funciona con las 8 filas de la maqueta y no con un sábado real.

  **El buscador aparece sólo si el día tuvo asistencias** — filtrar una lista vacía no lleva a ningún lado. La condición mira el **total del día**, no los resultados: si mirara los resultados, una búsqueda sin coincidencias haría desaparecer el campo con el que se escribió, dejando al operador sin forma de borrarla.

  **El contador del encabezado dice de qué número habla, con label visible.** Con búsqueda activa muestra `Resultados N`; sin ella, `Total N`. Mostrar siempre el total mientras la lista enseña tres filas sería engañoso, y mostrar siempre los resultados haría desaparecer el dato del día sin avisar.

  El Figma dibuja el número **suelto**, sin label, y así se construyó primero. No alcanza: esa maqueta tenía un solo valor posible, y acá el número alterna entre dos significados según haya búsqueda o no — suelto, no hay forma de saber cuál se está leyendo. El label va visible y no como `aria-label`, porque el problema es de lectura, no de accesibilidad. El énfasis tipográfico del número se conserva; lo que se agrega es una palabra en `text-muted-foreground` al lado.

  De paso, esto **unificó el markup de los dos viewports**: antes mobile tenía su propio span con el total inline —porque no hay título de card que le dé contexto al número— y desktop el número suelto. Con label, los dos usan el mismo bloque.

- **Sin asistencias no se muestra el contador.** El diseño lo dibuja siempre, pero la maqueta nunca tiene la lista vacía. Un `0` con el énfasis tipográfico de una métrica, al lado de un estado vacío que ya dice "Sin asistencias registradas", repite el dato y le da peso visual al caso menos informativo. En desktop desaparece sólo el número —el encabezado conserva el título o el navegador de día—; en mobile desaparece la banda entera, porque el total era su único contenido y el navegador vive afuera.

- **La fila muestra la hora donde el resto de las listas muestra un badge de estado.** Es lo que dibuja el diseño y tiene sentido: en la lista de un día puntual lo que se consulta es a qué hora entró alguien, no si su membresía vence pronto. Se pierde el ranking numerado (`#1`, `#2`…) que pinta v1, que de todas formas era el índice del array y no significaba nada.

### Decisiones técnicas

- **El tab no es estado local: se deriva de la URL.** `/v2/attendance` es *Registro diario* y muestra hoy; `/v2/attendance?date=YYYY-MM-DD` es *Historial*. Un solo parámetro gobierna el día visible **y** el tab activo, así que no existe la combinación incoherente —Historial mostrando hoy— y la vista queda compartible y navegable con el botón atrás. Es el criterio que el ADR [20260727141418](20260727141418_tab-en-url-para-listado-clientes-y-grupos.md) ya aplicó al listado de clientes.

  Consecuencia: `?date=` apuntando a hoy **redirige** a la ruta pelada. Sin eso habría dos URLs para el mismo contenido y la segunda dejaría subrayado el tab equivocado.

- **Búsqueda y página van en la URL, escritas con `history.replaceState`.** La vista queda compartible, sobrevive a un F5 y al botón atrás, y —lo que más pesa— **queda consistente con el listado de clientes**, que ya pone sus filtros y su página ahí. Dos secciones con tablas y comportamientos de URL distintos obligan al operador a recordar cuál es cuál.

  `replaceState` y no `router.replace`: el segundo re-ejecuta el server component y vuelve a consultar Supabase por el mismo día que ya está en memoria. Es exactamente el patrón —y el motivo— que documenta `CustomersSection`. Y `replace` en vez de `push` porque una entrada de historial por tecla convierte el botón atrás en un deshacer letra a letra.

  El filtrado sigue siendo **client-side**: la URL refleja el estado, no dispara una consulta. Son dos cosas independientes, y confundirlas fue el error de la primera versión (ver lecciones).

  Cambiar de día navega a una URL sin `?q=` ni `?page=`, así que la búsqueda no se arrastra al día siguiente. El `key={selectedDate}` de la page es lo que hace que el componente arranque de los valores nuevos en vez de conservar su estado.

- **El redirect de `?date=<hoy>` conserva `q` y `page`.** Saca sólo el parámetro redundante. Sin esto, recargar una vista filtrada de hoy la dejaba sin filtro.

- **El filtro no se aplica si el día no tuvo asistencias.** `isFiltered` exige `hasAssistances`, no sólo texto. Salió al escribir el test del punto anterior: un `?q=` en la URL de un día vacío dejaba la pantalla diciendo "sin resultados" con el buscador **oculto** —porque ése depende de que el día tenga filas— y por lo tanto sin ninguna forma de borrar la búsqueda. Sin asistencias el filtro no aplica y se ve el vacío del día, que es lo que realmente pasa.

- **`readParam` y `parsePageParam` se extrajeron a [lib/search-params.ts](../../../src/lib/search-params.ts).** Eran privados de `customer/filters.ts` y esta sección necesita los dos; copiarlos habría dejado dos parseos de query param que pueden divergir en el trato de `?q=a&q=b` o de un `?page=` roto.

- **El paginador recorta `page` durante el render en vez de corregirlo con un efecto.** Borrar caracteres de la búsqueda cambia cuántos resultados hay, y achicar el conjunto puede dejar seleccionada una página que ya no existe — con la lista vacía y resultados disponibles. `Math.min(page, lastPage)` lo resuelve sin un segundo render.

- **El filtro usa `normalizeSearchQuery`, no `normalizeText`.** Los dos sacan acentos y bajan a minúscula, pero el segundo además borra la puntuación, con lo que dejarían de encontrarse apellidos como "O'Brien" escritos tal cual. Es el mismo normalizador que el buscador de clientes usa contra la columna generada de la DB.

- **`ATTENDANCE_PAGE_SIZE` vive en `utils.ts`, no en el componente.** También la consumen los specs e2e, que corren en Node: importarla desde un módulo `'use client'` les arrastraría React y `next/navigation`. Misma clase de problema que el que rompió el build con el tipo de fila — ver la lección de abajo.

- **La validación del `?date=` se extrajo a [src/assistance/date-range.ts](../../../src/assistance/date-range.ts) y la comparten v1 y v2.** Estaba escrita como función local de la page de v1 y copiarla era el camino corto. Rechaza cuatro cosas con el mismo veredicto: un string sin forma de fecha, un día inexistente (`2026-02-31`, que `new Date` aceptaría corriéndolo al 3 de marzo), una fecha futura y una anterior a la ventana. Con dos copias, el día que alguien ampliara la ventana en una pantalla, la otra seguiría en 14 días y nadie lo notaría hasta comparar.

  Las comparaciones son entre strings `YYYY-MM-DD`, que ordenan lexicográficamente igual que cronológicamente. No es una optimización: evita construir `Date` intermedios, que es exactamente donde se cuelan los desfases de timezone.

- **`getAssistancesByDate` degradaba un error a lista vacía, y eso hacía imposible el estado de error.** Un fallo de red o de RLS se veía en pantalla igual que un día sin nadie. Se agregó `getAssistancesByDateResult`, que informa `failed`, y la función vieja quedó como wrapper que descarta el error — el comportamiento que v1 ya tenía y que para su accordion está bien. **El query es uno solo**: no hay una segunda copia de la consulta.

- **El `select` se extendió con `customer_membership (membership_type)`.** La línea secundaria de cada fila es el plan (`5 días`) y no se estaba trayendo. No es brecha de schema: el valor es la key del catálogo y la traduce `MembershipTranslation`, igual que en el listado de clientes. La normalización cubre objeto y array por el mismo motivo que documenta `mapCustomerRow` — el shape depende de cómo PostgREST interprete la relación, no de lo que pida el select.

- **El tipo `AssistanceByDate` y su normalizador viven en [utils.ts](../../../src/assistance/utils.ts), no en `api/server.ts`.** Ese archivo sólo depende de `@/lib/timezone`, así que es importable desde los dos lados. Ver la lección de abajo: ponerlos en el módulo del server rompe el build.

- **La lista no usa `DataTable`.** El Figma no dibuja una tabla en ninguno de los dos viewports: ni headers de columna ni filas `<tr>` en desktop, sino la misma lista apilada en 390 y en 1280. Meterla en el componente de tabla habría significado pasarle un `columns` que nunca se pinta.

- **`DateNavigation` es un port del `DayNavigator` de v1, no un reuso.** El de v1 está pintado con la paleta vieja (`text-white/80` sobre fondo oscuro), invisible sobre la superficie clara de v2, y el Figma lo dibuja como un grupo con borde y divisores en vez de tres controles sueltos. La lógica de navegación sí es la misma, incluido el detalle que importa: al volver a hoy se navega a la ruta **sin** `?date=`.

- **El switch desktop/mobile es por CSS, no por `useIsMobile()`.** Mismo motivo que documentó el AppShell en la fase 1.5: el hook sólo resuelve post-mount y produce un flash de la variante equivocada al recargar. Consecuencia asumida: las dos instancias del navegador de día existen en el DOM a la vez, y por eso llevan `id` distintos.

- **`capitalizeFirst` en `lib/utils/text.ts`, no la clase `capitalize` de Tailwind.** `text-transform: capitalize` capitaliza **cada palabra**, y sobre una fecha larga en español eso da "Jueves, 24 **De** Septiembre". `Intl` devuelve "jueves 24 de septiembre" y lo único que hay que corregir es el arranque de la oración. Se detectó en una captura del preview, no leyendo el código. El helper quedó en el módulo canónico de texto porque **el repo ya tenía tres copias inline** de la misma expresión (`v2/layout.tsx`, `AssistanceModal.tsx`, `format-date.ts`); no se migraron en este PR para no mezclar refactor con la fase, pero deberían converger ahí.

  El `DayNavigator` de v1 tiene el mismo defecto y **no se tocó**: está en producción y es un cambio cosmético que no pertenece a esta fase.

- **Los estados vacío, cargando y error los define esta fase.** El diseño no los cubre — la anotación `2118:29353` del canvas ("Ver estados del historial") lo anticipaba. Se usa el `EmptyState` ya transversal, con copy distinto para "hoy todavía no vino nadie" y "ese día no vino nadie": el primero es un estado transitorio y el segundo un hecho cerrado.

### Cobertura de tests

Primera fase que entrega con specs e2e, aprovechando la suite que llegó el 2026-09-26. Cubre seis cosas en [e2e/specs/attendance.spec.ts](../../../e2e/specs/attendance.spec.ts):

1. La asistencia recién registrada aparece en el día de hoy, con su plan y una hora.
2. **El día guardado es hoy en hora argentina**, verificado contra la DB.
3. Contador y buscador aparecen sólo si el día tuvo asistencias — el caso vacío **se afirma**, no se saltea, así el test sigue sirviendo el día que el gimnasio no abrió.
4. La lista nunca pinta más de 10 filas, el buscador deja exactamente la fila del cliente del test, y una búsqueda sin coincidencias muestra "sin resultados" con el campo todavía en pantalla.
5. El tab Historial abre en ayer y su botón "siguiente" está deshabilitado.
6. Una fecha imposible (`2026-02-31`) devuelve 404.
7. `?date=` apuntando a hoy redirige a la URL canónica.

El (2) es el que justifica el resto. **El bug de canonicalización de fechas no se ve en pantalla**: la lista se arma filtrando `assistance_date` por el rango del día en AR, y si ese rango se construyera con `new Date(iso)` en vez de `parseAppTzDateString`, la pantalla se vería perfecta mostrando el día equivocado. Es el modo de fallo que ya apareció dos veces en este repo (ADR [20260709153000](20260709153000_representacion-canonica-de-fechas-ar.md)).

El registro de asistencia por UI se extrajo del spec a `e2e/support/flows.ts`, porque ahora lo necesitan dos specs.

**Lo que quedó sin cubrir, y por qué.** Anotado para que sea una decisión y no un redescubrimiento:

- **La paginación con más de una página**, y con ella el recorte de `safePage`. Necesita un día con más de 10 asistencias, y montarlo requeriría 11 altas — contra un rate limit de **10 por hora**, que la suite ya consume en parte. Los tests cubren el invariante barato (la página nunca pinta más de 10 filas) pero no el paso a la página 2 ni su `?page=` en la URL. Si alguna vez se migra a Supabase local con seed, es lo primero que conviene agregar.
- **Que la URL se escriba con `replace` y no con `push`.** El test existe conceptualmente —buscar, `goBack`, verificar que se salió de la pantalla en vez de deshacer una letra— pero necesita un día con asistencias, o sea otra alta. El síntoma de la regresión es molesto pero inmediatamente visible al usar la pantalla, así que no justifica el costo.
- **Las funciones puras de `filters.ts` y `date-range.ts`** son lo más barato de testear que hay acá, y no tienen test: el proyecto no tiene runner unitario, sólo Playwright. Montar Vitest es una decisión de infra que excede esta fase.

## Auditoría de timezone

El plan marca esta fase como **riesgo alto** — todo el módulo pivotea sobre "qué día es hoy en AR". Call site por call site:

| Call site | Helper | Nota |
|---|---|---|
| `page.tsx` — "hoy" | `getTodayIsoDateInAppTz()` | No `new Date().toISOString().slice(0,10)` |
| `page.tsx` — día pedido → `Date` | `parseAppTzDateString(selectedDate)` | El punto crítico: `new Date(iso)` lo leería como medianoche UTC, que en AR son las 21hs del día anterior |
| `getAssistancesByDateResult` — rango | `getDayRangeInAppTz(date)` | Ya estaba, sin cambios |
| `date-range.ts` — ventana y comparaciones | `shiftIsoDateInAppTz` + comparación de strings | Sin `Date` intermedios |
| `DateNavigation` — día anterior/siguiente | `shiftIsoDateInAppTz` | Ya lo usaba el `DayNavigator` de v1 |
| `AttendanceList` — hora de la fila | `formatTimeInAppTz` | Formatea el timestamp UTC guardado en la TZ del negocio |

**No se escribe ninguna fecha en la DB en esta fase**: la sección es de sólo lectura.

## Consideraciones de seguridad

- **Autenticación / Autorización:** ninguna novedad. La ruta cuelga del layout de v2, que ya exige sesión y el flag `v2_access`; `assistance` y `customers` se leen con las policies de RLS vigentes y el mismo cliente de Supabase que usa el resto de la app. No se agregan RPCs ni se relajan políticas.
- **Exposición de datos:** la sección muestra nombre y plan de membresía de quienes asistieron — los mismos datos que el listado de clientes ya expone al mismo rol. No se agrega DNI, teléfono ni email a la vista, aunque el `select` los traiga (venían del query original de v1 y se dejaron para no cambiarle el shape a sus consumidores).
- **Validación de input:** el único input no confiable es el `?date=` de la URL, y es justamente lo que `resolveAssistanceDate` valida antes de que llegue a la consulta. No se construye SQL: el filtro va por el query builder de supabase-js.
- **Dependencias:** ninguna nueva.
- **Infraestructura:** sin cambios.

## Lecciones aprendidas

- **El árbol de nodos de Figma dice qué instancias hay, no qué hacen.** Tercera vez que una inferencia sacada de él resulta falsa. La conclusión práctica, ya escrita como regla operativa del plan, se refuerza: pedir la captura antes de definir la pantalla, incluso cuando el árbol "parece" suficiente.

- **Una maqueta tiene datos de relleno y hay que distinguirlos de los requisitos.** Acá había tres: el contador decía 12 y 20 sobre las mismas 8 filas listadas; todas las filas decían `08:14`, lo que hacía que el orden se viera alfabético sin serlo; y "Hoy" y "Ayer" mostraban a las mismas 8 personas. El orden se mantuvo en hora descendente, como v1 — en el mostrador lo útil es quién entró recién.

- **Un estado de error no se puede mostrar si la capa de datos ya lo tragó.** La intención de "lista con estados vacío/cargando/error" chocó con que `getAssistancesByDate` devolvía `[]` ante cualquier fallo. Es el tipo de decisión —degradar en silencio— que parece defensiva y termina borrando información que una pantalla posterior necesita.

- **"Estado en la URL" y "refetch al server" son cosas independientes, y confundirlas costó una decisión mal tomada.** La primera versión dejó búsqueda y página como estado local, argumentando que meterlas en la URL dispararía un round-trip por cada tecla. La premisa era cierta sólo para `router.push`/`router.replace`; `history.replaceState` actualiza la URL sin navegación. **El repo ya tenía la técnica y el razonamiento escritos** en `CustomersSection`, el componente hermano de la misma fase del rediseño.

  Lo que falló no fue el conocimiento de la API sino el orden del trabajo: se justificó una divergencia con la sección más parecida **sin ir a leer cómo la había resuelto ella**. Regla práctica: cuando una decisión se aparta de lo que hace una pantalla equivalente del mismo rediseño, el primer paso es abrir esa pantalla, no argumentar.

- **Un `import type` no protege si del mismo módulo también importás un valor.** La primera versión puso `AssistanceByDate` y `getAssistanceMembershipType` en `api/server.ts`, y los componentes client importaban el tipo con `import type` —que se borra en compilación— pero la función como valor normal. Con eso el bundler arrastra el módulo entero, y con él `next/headers`:

  ```
  × You're importing a component that needs "next/headers".
  ./src/lib/supabase/server.ts → ./src/assistance/api/server.ts
    → AttendanceList.tsx → AttendanceSection.tsx
  ```

  **No lo atrapó ni `type-check` ni `lint`**: los dos pasaron limpios. Es un error de bundling, y el único que lo ve es `next build` o el dev server al pedir la ruta. La solución fue mover las dos cosas a `utils.ts`, que ya era client-safe. **Regla para lo que venga: un módulo de dominio que exporta tipos usados por componentes client no puede vivir junto a código que toca `next/headers` o el cliente de Supabase del server.**

- **Lo anterior deja una consecuencia para el flujo de trabajo:** `npm run type-check` y `npm run lint` no alcanzan como verificación local cuando se agrega una pantalla nueva. Un `npm run build` es lo único que prueba que los límites server/client están bien trazados.

- **El sidebar de las capturas marca `Inicio` activo, no `Asistencias`**, en las dos pantallas desktop, aunque el ítem exista en el menú. Se implementó marcando `Asistencias`, que es lo que la navegación real exige. Queda anotado para el diseñador.

## Plan

### Pasos

1. Extender el `select` de `getAssistancesByDate` con `customer_membership (membership_type)`, separar `getAssistancesByDateResult` para poder distinguir el error, y dejar el tipo de fila + su normalizador en `utils.ts` para que los componentes client puedan importarlos.
2. Extraer la validación de `?date=` a `assistance/date-range.ts` y migrar la page de v1 a usarla.
3. `DateNavigation`, `AttendanceList` y `AttendanceSection` en `assistance/components/v2/`.
4. Reemplazar el `UnderConstruction` de `/v2/attendance`.
5. Enganchar el `href` del card "Asistencias de hoy" del home, que no lo tenía.
6. Claves `v2.attendance.*` en `es.json` y `en.json`.
7. Specs e2e de la sección, extrayendo `registerAssistanceViaUI` a `support/flows.ts`.
8. Actualizar la sección de testing de `CLAUDE.md`, que seguía diciendo que no había framework de tests.
