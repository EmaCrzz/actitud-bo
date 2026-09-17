# Búsqueda de clientes insensible a acentos

**Fecha:** 2026-08-19
**Autor:** emanuel@getlenk.com
**Rama:** feat/v2-attendance-modal

## Descripción

El buscador de clientes discriminaba diacríticos: buscar "Maiten" no devolvía a
"Maitén", ni "Nicolas" a "Nicolás". Como la mayoría de los nombres se cargan con
acento pero se tipean sin él, el buscador aparentaba que el cliente no existía —
con el riesgo operativo de que en el mostrador se termine dando de alta un
duplicado.

La causa: los tres call sites de búsqueda hacían `ilike` sobre la columna generada
`customers.full_name` (introducida en la
[migración 20260724120000](../../../supabase/migrations/20260724120000_customer_full_name_search.sql)),
y `ilike` en Postgres solo es insensible a mayúsculas, no a diacríticos.

El bug era además inconsistente: los filtros client-side de `customer/stats/actives`
y `customer/stats/pendings` sí normalizaban con `normalizeText` (que quita acentos),
así que el mismo cliente aparecía en el listado filtrado pero no en el buscador.

De paso se corrigió una deuda adyacente: `searchAllCustomers` (server) seguía
filtrando por `first_name`, sin haberse actualizado a `full_name` cuando se
introdujo esa columna. O sea que la búsqueda server-side ignoraba el apellido.

## Decisiones

### Decisiones de negocio

- La búsqueda ignora acentos en **ambas direcciones**: "Maiten" encuentra "Maitén"
  y "Maitén" encuentra "Maiten". Es el comportamiento que espera quien atiende el
  mostrador, que tipea rápido y sin acentos.
- **No** se ignora la puntuación. Apellidos como "O'Brien" o "Saint-Denis" se
  buscan tal cual se escriben. Descartamos reusar `normalizeText` para el query
  justamente por esto: `normalizeText` elimina puntuación, y como la columna de la
  DB no lo hace, normalizar solo un lado habría roto esos apellidos.

### Decisiones técnicas

- **Segunda columna generada `full_name_search`** = `unaccent(lower(full_name))`,
  con su propio índice GIN trigram. Alternativas descartadas:
  - *Filtrar en cliente:* obligaría a traerse la tabla entera y rompe la paginación
    de `fetchCustomersPage`.
  - *`unaccent()` en el `WHERE`:* PostgREST no permite aplicar funciones al lado
    izquierdo de un filtro, y aunque pudiera, invalidaría el índice.
  - *Reemplazar `full_name` en vez de agregar una columna:* se dejó `full_name`
    intacta para no romper consumidores futuros ni forzar un rewrite mayor. El
    costo es una columna stored extra por fila — despreciable a esta escala.
- **No se puede referenciar `full_name` desde la nueva columna generada:** Postgres
  prohíbe que una columna generada dependa de otra, así que la expresión
  `trim(coalesce(first_name,'') || ' ' || coalesce(last_name,''))` queda duplicada.
  Si cambia el criterio de armado del nombre completo, hay que tocar las dos.
- **Wrapper `public.immutable_unaccent(text)`:** `unaccent()` está declarada STABLE
  (depende del lookup del diccionario) y las columnas generadas exigen IMMUTABLE.
  El wrapper —patrón estándar para este caso— fija el diccionario explícitamente
  vía `unaccent('unaccent'::regdictionary, $1)` y un `search_path` cerrado, con lo
  cual el resultado es determinístico para un diccionario dado.
- **Normalización simétrica en JS:** se agregó `normalizeSearchQuery` en
  `src/lib/utils/text.ts` (lower + quitar diacríticos, sin tocar puntuación) y se
  refactorizó `normalizeText` para compartir el helper `removeAccents`, evitando
  duplicar la lógica de diacríticos. `normalizeText` mantiene exactamente su
  comportamiento previo.
- **Los tres call sites quedan alineados** (`_searchCustomer`, `_fetchCustomersPage`,
  `searchAllCustomers`): misma columna, misma normalización.

## Consideraciones de seguridad

- **Autenticación / Autorización:** sin cambios. `full_name_search` se agrega a
  `customers`, que ya está bajo RLS; el grant de `SELECT` es a nivel tabla, así que
  la columna nueva hereda las mismas políticas. No se expone ningún dato que el rol
  no pudiera leer ya.
- **Exposición de datos:** la columna es un derivado determinístico de
  `first_name` + `last_name`, ambos ya legibles por los mismos roles. Sin
  información nueva.
- **Validación de input:** el query sigue interpolándose en el patrón `ilike` vía
  supabase-js, que parametriza el valor — no hay riesgo de inyección. Queda
  pendiente (no introducido por este cambio) que `%` y `_` tipeados por el usuario
  se siguen interpretando como wildcards: un `%` devuelve todos los clientes. Es
  ruido de UX, no un problema de seguridad, y la búsqueda ya está bajo rate limit
  (30/min).
- **Dependencias:** ninguna nueva a nivel npm. En la DB se habilita la extensión
  `unaccent`, que es parte del contrib oficial de Postgres y viene disponible en
  Supabase.
- **Infraestructura:** sin cambios en exposición de red ni permisos.

## Lecciones aprendidas

- Cuando se introdujo `full_name` (migración 20260724120000) se actualizaron los dos
  call sites de cliente pero se olvidó el de server (`searchAllCustomers`, que
  siguió con `first_name`). Al tocar la búsqueda conviene grepear `ilike` en todo
  `src/` en vez de confiar en que los consumidores son los que uno recuerda.
- Tener normalización en cliente (`normalizeText`) y en DB (`ilike` crudo) con
  criterios distintos produce bugs que se manifiestan solo en algunas pantallas —
  eso hizo que este pasara desapercibido más tiempo.

## Plan

### Pasos

1. Migración `20260819170000_customer_search_unaccent.sql`: extensión `unaccent`,
   función `immutable_unaccent`, columna generada `full_name_search` e índice GIN
   trigram.
2. `src/lib/utils/text.ts`: extraer `removeAccents`, agregar `normalizeSearchQuery`,
   refactorizar `normalizeText` sobre el helper compartido.
3. Apuntar los tres call sites a `full_name_search` normalizando el query:
   `_searchCustomer`, `_fetchCustomersPage` (client) y `searchAllCustomers` (server).
4. `type-check` + `lint`.
5. Aplicar la migración a la DB de development **antes** de pushear el código — el
   código lee una columna que si no, no existe todavía, y dev/preview comparten DB.
