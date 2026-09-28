# Sección Membresías y apertura del catálogo de planes (Fase 10)

**Fecha:** 2026-09-28
**Autor:** emanuel@getlenk.com
**Rama:** feat/v2-membresias

## Descripción

La Fase 10 del rediseño construye `Configuraciones → Membresías`: el listado de planes con precios, frecuencia, cantidad de clientes y estado, más los paneles de editar y crear.

Estaba bloqueada desde el 2026-08-17 por la **decisión #7** del plan v2, planteada así: *"si la sección permite crear planes, `MembershipTypeArray` deja de ser la fuente de verdad y los nombres salen de la DB, perdiendo i18n por key"*. La pregunta se cerró dos veces, y la segunda invirtió la primera.

**Primer cierre (mañana del 28/09), sin las capturas a la vista.** El inventario del código encontró que la clave del tipo de membresía gobierna cuatro comportamientos, no sólo el nombre: el cupo semanal (`SLOTS_BY_TYPE`), si el plan se cobra (`pricing.ts` exceptúa al VIP), si tiene modalidades de cobro (`charge-mode.ts` exceptúa al VIP y a la Diaria) y tres ramas del RPC de alta escritas en SQL comparando el string literal. La conclusión fue que un plan creado desde un formulario nacería sin nada de eso y sin fallar ruidosamente, y la recomendación, que la fase editara precios y estado sin crear planes.

**Segundo cierre, con las capturas.** El Figma tiene `Nueva membresía` en el header, un CTA sticky en mobile, y dos planes que no existen en el catálogo — `Plan familiar 5 días` y `Plan familiar 3 días`. Y, decisivo: **el formulario ya incluye "Frecuencia de días"**, que es exactamente la columna `weekly_quota` que el primer cierre proponía como fase previa. El diseñador había resuelto el problema antes de que lo planteáramos.

Con eso el argumento se da vuelta. Las cuatro ramificaciones son excepciones de **VIP y Diaria** — dos planes que ya existen y de los que nadie va a crear más. Un `Plan familiar 5 días` es un plan mensual ordinario y cae en la rama por defecto en todos lados. La única que lo rompía era el mapa de cupo semanal, y el diseño acaba de convertirlo en columna.

## Decisiones

### Decisiones de negocio

- **El catálogo es híbrido: se pueden crear planes, y los 5 originales conservan su comportamiento especial.** Los planes nuevos son ordinarios —mensuales, cobrables, con modalidades de cobro y con el cupo que se les cargó— y su nombre sale de `types_memberships.name`. Los 5 del catálogo dejan `name` en NULL y siguen resolviendo por key i18n, así que sumar un idioma no requiere migrar datos.

- **El nombre de los 5 planes originales no se puede editar.** El formulario oculta el campo cuando el plan es del catálogo. Renombrarlos desde la UI cambiaría el nombre en un idioma y lo dejaría intacto en el otro: la etiqueta vive en el diccionario, no en la fila.

- **Discontinuar es `active = false`, y no hay botón de eliminar.** Un plan inactivo desaparece de los selects de alta y renovación, y se sigue mostrando en los clientes y pagos que ya lo tienen. La sección es la única pantalla que lista los inactivos, porque es donde se los reactiva.

- **"Sin costo" se muestra para precio 0 *y* para NULL, y los precios se guardan tal cual se tipean.** La primera versión convertía 0 → NULL al guardar, con el argumento de que "sin precio" se modela mejor con NULL. Medir la DB de dev mostró que **el VIP está cargado con `amount = 0`**, y el listado de precios de v1 filtra por `amount IS NOT NULL`: la conversión lo habría hecho desaparecer de una pantalla de v1 que hoy lo muestra. Un 0 y un NULL se renderizan igual, así que la distinción no le servía a nadie y sí podía romper algo.

- **El campo Estado se agregó al formulario aunque el Figma no lo dibuje.** La tabla muestra la columna, pero ninguno de los dos formularios de las capturas la incluye. Decisión de Ema: asumir que el diseñador lo va a sumar. Sin él, un plan se podría crear pero nunca discontinuar — media funcionalidad.

- **La sección vive en `/v2/settings/memberships`.** Había stub en esa ruta y también en `/v2/memberships`, con un ítem de primer nivel en el sidebar. Las capturas la ponen bajo Configuraciones y **su sidebar no dibuja `Membresías` en el primer nivel**, así que se borró el stub duplicado, se sacó el ítem y se quitó la constante `V2_MEMBERSHIPS`.

### Decisiones técnicas

- **Resolvers en `membership/catalog.ts`, en vez de abrir `MembershipTypes` a `string`.** Esa unión tiene **79 usos en 26 archivos**, la mitad en v1. Ensancharla habría sido un cambio transversal para habilitar una pantalla. En su lugar `MembershipTypes` queda representando lo que realmente es —los 5 tipos con comportamiento especial— y `getMembershipLabel` / `getWeeklySlots` reciben `string` y resuelven con fallback.

  **El patrón no se inventó: ya existía dos veces.** `formatMembershipLabel` recibía `type: string`, casteaba para el lookup y caía al string crudo; `AssistanceModal` hacía el mismo guard con `in`. Las dos se migraron al resolver.

- **`getWeeklySlots` devuelve `null`, no un número por defecto.** El faltante queda explícito y cada caller decide qué mostrar. El fallback de presentación es `DEFAULT_WEEKLY_SLOTS`, nombrado en vez de un `5` suelto.

- **Los ~20 call sites que etiquetan un plan se migraron al resolver, v1 incluida.** No era opcional: indexar `MembershipTranslation[type]` con una clave que no está en el diccionario da `undefined`, y `t(undefined)` **tira la pantalla entera**. Ver "Lecciones aprendidas".

- **`getMembershipTwoLineLabel` para la variante partida en dos.** Tres call sites (`customer/membership.tsx`, `stats/actives.tsx`) renderizan `{ one, two }` por separado. Un plan creado desde la UI no se puede partir —su nombre es una frase libre— así que devuelve todo en `one` y `two` vacío; los call sites concatenan con un espacio y no se nota.

- **Cuando no hay `name` a mano, la clave se humaniza** (`PLAN_FAMILIAR_5_DIAS` → `Plan familiar 5 dias`). La mayoría de las queries traen `membership_type` sin joinear `types_memberships`, así que la alternativa era mostrar la clave cruda en la tabla de clientes. Es aproximado —se pierden los acentos— y está documentado como tal: **donde el `name` real esté disponible se pasa, y gana**. Pasarlo por el resto de las queries es trabajo de seguimiento.

- **La clave del plan se deriva del nombre** (`Plan familiar 5 días` → `PLAN_FAMILIAR_5_DIAS`), reutilizando `removeAccents` de `lib/utils/text.ts`. El formulario pide un nombre porque lo usa el dueño del gimnasio, no un campo técnico. Dos nombres pueden colapsar en la misma clave; **lo frena el `UNIQUE` que `type` ya tenía**, y el error se muestra como frase en el formulario en vez de como código de Postgres.

  No lleva prefijo `MEMBERSHIP_TYPE_`: esa forma la tienen los 5 originales y conviene poder distinguir en la DB, de un vistazo, cuáles llevan comportamiento especial en el código.

- **`includeUnpriced` como opción, en vez de sacar el filtro.** `getMembershipTypes` del server filtra `amount IS NOT NULL`. La sección nueva administra planes, así que uno sin precio no puede quedar invisible ahí; v1 no pidió cambiar y se queda con el default `false`. *(El filtro hoy no excluye a nadie —las 5 filas tienen precio— pero la columna es nullable.)*

- **El conteo de clientes por plan se agrega en memoria.** PostgREST sólo sabe contar relaciones con un agregado sobre el embed, y eso obliga a traer las filas de `customer_membership`. Se trae una sola columna de ~600 filas y se cuenta con un `Map`.

- **`MEMBERSHIP_TYPE_COLUMNS` como constante única.** La lista de columnas estaba repetida como string literal en cuatro queries entre `api/server.ts` y `api/client.ts`. Al sumar tres columnas, actualizar tres de las cuatro habría dado un plan sin `active` que la UI renderiza como inactivo — un bug que no falla, sólo miente.

- **`last_update` pasa a actualizarse por trigger, no por caller.** Un caller nuevo que se olvide de escribirla reintroduce el bug en silencio.

## Consideraciones de seguridad

- **Autenticación / Autorización:** la migración fija el INSERT sobre `types_memberships` en admin-only. **Medido en los dos entornos el 2026-09-28: ninguno tenía policy de INSERT**, o sea que RLS lo denegaba para todos. Prod sólo tiene `SELECT` (todos los autenticados), `UPDATE` y `DELETE` (admin).

  Eso **corrige la lectura inicial de este ADR**, que a partir del comentario de la migración `20260630180001` —*"antes sólo existían INSERT (authenticated) y SELECT (public)"*— supuso que en prod podía seguir habiendo una policy abierta a cualquier autenticado. Describía el estado de julio; esa policy se eliminó después, probablemente en `20260701160000`, que limpió las "policies laxas y duplicadas".

  **Conclusión: la migración no cierra ningún agujero, habilita una función que hoy está denegada.** No hubo exposición en ningún momento. La consecuencia operativa es la inversa de la que había anotado: **sin esta migración, crear un plan en prod fallaría con error de RLS**, así que es requisito para que la pantalla funcione, no una mejora de seguridad.

  El agujero hermano del alta VIP anotado en el ADR de la Fase 7 **sigue abierto** y no lo toca esta fase.

- **Integridad de datos:** `customer_membership.membership_type` referencia a `types_memberships(type)` con **`ON DELETE CASCADE`** desde `20260701160000` — **verificado en prod el 2026-09-28** (`confdeltype = 'c'`), así que el riesgo es real y no heredado de dev, casi con seguridad copiado de la FK de al lado (`customer_id → customers`, donde el cascade sí corresponde). El efecto real: borrar un plan **borra la membresía de todos sus clientes**. No era hipotético — la policy de DELETE existe y es admin-only, así que un admin lo podía hacer desde la API. Lo único que a veces lo frenaba era la FK de `membership_payments`, que no declara acción (`NO ACTION`) y bloquea si el plan tiene pagos; un plan con clientes pero sin pagos se borraba en cascada, sin ruido. Pasa a `RESTRICT`.

- **Validación de input:** el nombre del plan se normaliza a una clave con un regex que sólo deja `[A-Z0-9_]`, así que no llega input arbitrario a la columna que los RPCs comparan. Los precios pasan por `InputCurrency` y por el CHECK `>= 0` que la tabla ya tenía; el cupo por el CHECK `1..7` nuevo.

- **Exposición de datos:** ninguna. La tabla ya era `SELECT` público para autenticados y no se agregó ningún dato sensible: el conteo de clientes por plan es un agregado que el listado de clientes ya permite derivar.

- **Dependencias:** ninguna nueva.

## Lecciones aprendidas

- **La suite e2e encontró un bug que tiraba la app entera, y lo encontró porque los tests nuevos escriben datos que los viejos después leen.** Al correr la suite completa, cuatro specs de `payment-accounting` fallaron con `#membership_type` inencontrable. La causa: `Cannot read properties of undefined (reading 'split')` en `i18n/api.ts` — el alta de cliente resolvía la etiqueta con `MembershipTranslation[type]`, que para los planes `[E2E]` recién creados da `undefined`, y `t(undefined)` revienta. **El error boundary se comía la pantalla completa, no sólo la fila del plan nuevo.**

  Lo que hace valioso el hallazgo es la mecánica: el spec de membresías creó planes, y el spec de altas —escrito meses antes, sin saber que eso podía pasar— los encontró. Ninguna revisión de código lo iba a ver, porque cada call site leído por separado parece correcto.

  **Cuánto se había subestimado el alcance:** el plan decía "migrar los tres call sites que duplicaban la lógica". Eran **~20**, repartidos entre v1 y v2 — cualquier pantalla que muestre el plan de un cliente o de un pago. La decisión de no abrir `MembershipTypes` a `string` sigue siendo correcta (eso eran 79 usos), pero **evitar el cambio de tipos no evitaba el cambio de runtime**: eso era lo que había que contar.

- **`router.refresh()` no alcanza cuando hay dos cachés, y la que importaba era la del cliente.** Ema probó la fase y encontró que un plan recién creado no aparecía en el select de renovación hasta recargar. La sección es un server component y el `refresh()` la revalidaba bien; lo que quedaba viejo era la caché de React Query del catálogo, que los selects de **alta y renovación** leen con 5 minutos de `staleTime`. La key `'membership-types'` estaba escrita como literal en cinco lugares, y esa dispersión es la razón por la que agregar una pantalla que escribe no disparó ninguna alarma: no había un lugar donde mirar. Ahora vive en `hooks/use-membership-types-cache.ts` con el hook de invalidación, y el form de precios de v1 —que ya invalidaba a mano— usa la misma constante.

- **El primer spec que escribí para ese bug pasaba con y sin el arreglo.** Creaba el plan y recién después abría el alta: con la caché fría, el primer fetch traía el plan igual. **La condición esencial era calentar la caché antes de crear**, que es lo que había hecho Ema navegando. Sólo se vio al validar por mutación — el test parecía razonable y verificaba nada. Vale como recordatorio de que en un test contra caché, *cuándo* se puebla es parte del caso, no preparación.

- **Dos de mis specs eran falsos positivos por mirar el paso equivocado del formulario.** El select de membresía vive en el **paso 2** del alta y yo afirmaba sobre él apenas abierto el panel, en el paso 1: "el plan discontinuado no aparece" daba verdadero porque no había ningún select montado. Se agregó un helper que avanza al paso 2, y el assert negativo ahora va acompañado de uno positivo —que un plan del catálogo sí esté— para que un select vacío por cualquier otro motivo no haga pasar el test.

- **Dos guards defensivos preexistentes estaban mal, y el que "protegía" mentía.** `AttendanceList` chequeaba `membershipType in MembershipTranslation` antes de traducir, lo que evita el crash pero muestra **"Sin membresía" a un cliente que sí tiene una**. `AssistanceModal` hacía lo mismo con `in SLOTS_BY_TYPE` y caía a 5 casilleros. Un guard que evita el crash cambiando el significado del dato es peor que el crash: nadie abre un ticket por un cliente que figura sin membresía, lo asume mal cargado.

- **Se agregó el primer smoke de v1 de la suite**, porque esta fase tocó ~20 de sus archivos y hasta acá "v1 sigue funcionando" se verificaba a ojo. Seis pantallas que cargan sin errores de consola, más un caso que inserta un plan fuera del catálogo directo en la DB y exige que `/stats/accounting?tab=membership` lo muestre. Validado por mutación: volviendo `amounts.tsx` al indexado directo del diccionario, el test **falla en el assert del tab** — o sea que la pantalla entera se cae, no sólo la fila. Es el modo de fallo exacto que la fase introdujo.

- **Medir la DB desmintió dos supuestos que ya estaban escritos en el ADR.** El VIP tiene `amount = 0`, no `NULL`, así que (a) el filtro `amount IS NOT NULL` no lo excluía de v1 como yo había afirmado, y (b) la primera versión le habría puesto `$ 0` donde el Figma dice "Sin costo". Y el `DO` block de policies no emitió NOTICE en dev: **no había policy de INSERT**, o sea que ahí la migración habilita la creación en vez de cerrar un agujero. Los tres supuestos venían de leer migraciones y código; los tres se caían con una query.

- **Un guard de `test.skip` puede estar roto de la misma forma que el código que testea.** El spec "un `?q=` sobre un día sin asistencias" se saltea si el día tuvo movimiento, y medía eso **contando filas renderizadas** — que con un `?q=` que no matchea son cero también en un día con asistencias. Por eso no se salteó y falló contra el estado "sin resultados". Ahora mira si el buscador se renderizó, que es la señal correcta: sólo aparece si el día tuvo asistencias. Es preexistente de la Fase 9 y se arregló acá porque dejaba la suite en rojo.

- **La decisión se cerró dos veces, y la primera vez con la información incompleta.** El inventario del código fue correcto y la conclusión que sacó de él fue equivocada, porque le faltaba el frame que mostraba que el diseñador ya había modelado `weekly_quota` como campo. **Cuarta vez en este plan que una inferencia sin la captura resulta falsa** — antes fueron el "dropdown de acciones de fila" de la 6b, la premisa de la decisión #5 y los tabs de la 9. La diferencia es que acá el error no fue leer mal el árbol de nodos: fue razonar sobre el alcance de una pantalla sin haberla visto.

  Lo que salva el episodio es que el inventario **igual sirvió**: las cuatro ramificaciones que encontró son las que definieron la forma del catálogo híbrido. La conclusión estaba mal, el relevamiento no.

- **`ON DELETE CASCADE` en una FK a tabla de catálogo es casi siempre un copy/paste.** Apareció leyendo la migración para escribir otra cosa. Vale como cosa a mirar: una FK que apunta a una tabla de *valores* (tipos, categorías, estados) casi nunca quiere cascade — el cascade tiene sentido cuando el padre es el *dueño* de la fila hija.

- **Tres de las cuatro ramificaciones ya tenían su fallback escrito a mano, cada una distinta.** `formatMembershipLabel` con cast + `if (single)`, `AssistanceModal` con `in`, y `CustomerCounter` **sin ninguno** — un mapa duplicado de `SLOTS_BY_TYPE` que devolvía `undefined` y, vía `Array.from({ length: undefined })`, renderizaba cero casilleros de asistencia sin error. El patrón ya estaba en el repo; lo que faltaba era que estuviera en un solo lugar, y el call site que se olvidó de copiarlo es justo el que fallaba en silencio.

- **Los tests se validaron por mutación**, como fijó el ADR `20260926164830`:

  | Mutación | Resultado |
  |---|---|
  | `getWeeklySlots`: `weeklyQuota != null` → `weeklyQuota` (el 0 falsy) | 1 test en rojo |
  | `membershipTypeKeyFromName`: sacar el strip de `_` en los extremos | 2 tests en rojo |
  | `getMembershipLabel`: dejar de preferir la key i18n | 2 tests en rojo |

  Las tres revertidas y verificado con `git diff` que `catalog.ts` quedó sin cambios; 84/84 en verde.

## Plan

### Pasos

1. Migración aditiva: `name`, `weekly_quota`, `active`; backfill del cupo desde `SLOTS_BY_TYPE`; trigger de `last_update`; INSERT admin-only; FK a `RESTRICT`.
2. `membership/catalog.ts` con `isCatalogMembershipType`, `getMembershipLabel`, `getWeeklySlots` y `membershipTypeKeyFromName`; migrar los tres call sites que duplicaban la lógica.
3. Capa de datos: `includeUnpriced` / `includeInactive`, `getMembershipPlans` con el conteo, `createMembershipPlan`, `updateMembershipPlan`, y el filtro por `active` en el `getMembershipTypes` del client.
4. UI: `MembershipPlansSection` (tabla + paginador + CTA sticky mobile) y `PlanFormPanel` (crear/editar en un solo panel).
5. Ruta: mover a `/v2/settings/memberships`, sacar el ítem de primer nivel del sidebar, borrar el stub y la constante.
6. Tests: 24 unit sobre los resolvers, validados por mutación; 5 specs e2e con verificación contra la DB; extender el teardown a los planes `[E2E]`.
7. Este ADR y la actualización del plan.
