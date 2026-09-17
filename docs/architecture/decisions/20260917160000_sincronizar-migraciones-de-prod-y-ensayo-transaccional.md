# Sincronizar migraciones de prod y ensayo transaccional antes del push

**Fecha:** 2026-09-17
**Autor:** emanuel@getlenk.com
**Rama:** chore/sincronizar-migraciones-prod

## Descripción

Producción quedó **4 migraciones atrás** de `develop`, y en esa brecha se acumuló una incompatibilidad que no se veía: `develop` ya tiene código de **v1** leyendo objetos de base que en producción no existen. Liberar `develop` a `main` sin aplicar antes esas migraciones habría roto la app que el gimnasio usa todos los días.

El disparador fue una pregunta de Ema: *"las migraciones corrigen dev, pero esto no llegará a prod rápido porque la v2 va en paralelo; lo que arreglás hoy puede no ser lo mismo cuando lleguen. ¿Cómo lo resolvemos?"*. La respuesta corta es que el problema no era el desfase temporal sino el desfase **acumulado**, y que la política correcta es no dejar que exista.

### Qué se habría roto

Tres flujos de **v1**, con producción corriendo el código nuevo contra el schema viejo:

| Flujo | Objeto que falta en prod | Síntoma |
|---|---|---|
| **Búsqueda para registrar asistencia** (`assistance/search.tsx`) | `customers.full_name_search` | La búsqueda no devuelve nada. Es el flujo más usado de la app. |
| **Listado de clientes** (`/customer`) | vista `customers_listing` + `full_name_search` | **Lista vacía, en silencio**: `searchAllCustomers` atrapa el error y degrada a `{ customers: [], total: 0 }` |
| Buscador del listado (`customer/list.tsx`) | ídem | Estado de error de react-query |

El caso del listado es el peor de los tres justamente porque **no falla**: no hay pantalla de error, sólo "no hay clientes".

### Por qué pasó

El feature flag `v2_access` gatea la **UI**, no el schema. El gate en sí es correcto — es server-side en el layout de `/v2/*`, hace `redirect(HOME)` sin el flag, y falla cerrado (sin usuario devuelve `[]`). Pero eso protege de las *pantallas* v2, no de que trabajo de v2 cambie objetos que v1 también consume. Y eso venía pasando a propósito: la Fase 6b movió el listado v1 al query canónico compartido y le cambió el orden, decisión documentada en su propio ADR.

O sea: el riesgo nunca estuvo en que alguien viera la v2 sin permiso, sino en que el schema y el código de v1 se desincronizaran entre entornos.

## Decisiones

### Decisiones de negocio

- **Las migraciones se liberan a prod de forma continua, release a release**, en vez de acumularse hasta que termine el rediseño. Decisión de Ema. La v2 viaja apagada detrás del flag, así que `develop` → `main` puede seguir liberando normalmente.
- **Todo cambio de v2 debe dejar v1 funcionando, incluso si hay que modificar v1 para lograrlo.** Es la contracara necesaria de lo anterior: si las dos versiones comparten schema y código, la compatibilidad no es opcional.

### Decisiones técnicas

- **El orden de este release es migración primero.** No es una excepción: es lo que ya documenta [`docs/workflow.md`](../../workflow.md) para migraciones aditivas. Vale anotarlo porque el orden inverso — código primero — es correcto para el caso distinto de una migración que *rechaza lo que el código viejo escribe* (el incidente de `payment_method` del 2026-07-08), y aplicar esa costumbre acá habría causado el corte.

- **Las 6 migraciones pendientes son aditivas respecto del código v0.11.0 que corre hoy en prod**, clasificadas contra la taxonomía de `workflow.md`. Dos merecen mención explícita porque tocan objetos existentes:

  - `20260916183000` hace `CREATE OR REPLACE` de `increment_assistance_count`, que a primera vista cae en "cambiar el comportamiento de una función que el código ya usa". No aplica: conserva `assistance_count = assistance_count + 1` y sólo suma una columna nueva al mismo `SET`. El código viejo no se entera.
  - `20260917120100` (índice UNIQUE de asistencia) sí cambia el comportamiento para el código viejo: antes podía insertar duplicados y ahora no. No rompe — las dos UIs de v1 ya prevenían el duplicado — pero durante la ventana previa al deploy, un intento mostraría el error crudo de Postgres. Es degradación de UX en un caso raro, no una falla.

- **`unaccent` se crea en `public`**, que es donde ya vive `pg_trgm` en prod. Consistente con el entorno existente.

- **Ensayo transaccional como paso obligatorio antes de cualquier `db:push-prod`.** DDL en Postgres es transaccional, así que las migraciones pendientes pueden correrse contra producción dentro de `BEGIN … ROLLBACK`: sentencias exactas, schema real, datos reales, cero persistencia. Se automatizó en [`scripts/rehearse-migrations.sh`](../../../scripts/rehearse-migrations.sh).

  Alternativas descartadas: **Docker local** (no disponible en la máquina), y **`db:restore-dev`** para clonar prod en dev y ensayar ahí (funciona, pero dev está compartida con el preview donde el otro dev valida, así que pisarla tiene costo de coordinación). El ensayo transaccional da la misma señal sin costo.

- **El script usa `lock_timeout = 5s`.** Si hay tráfico real en el medio, preferimos que el ensayo falle rápido antes que encolar y bloquear a los usuarios del entorno.

## Consideraciones de seguridad

- **Autenticación / Autorización:** sin cambios. Se auditó el gate de `v2_access` y se confirmó que es server-side, cubre todas las rutas bajo `/v2/*` por el layout, y **falla cerrado**: sin usuario o sin perfil devuelve `[]`, y sin el flag hace `redirect(HOME)`. En prod la tabla `user_feature_flags` ni siquiera existe todavía, así que hoy el acceso es doblemente imposible. Al aplicar las migraciones la tabla se crea **vacía**: nadie obtiene el flag por el solo hecho de migrar.
- **Exposición de datos:** ninguna nueva. La vista `customers_listing` se creó con `security_invoker = true` (verificado contra la API real en su ADR original), así que respeta la RLS de la tabla base.
- **Validación de input:** sin cambios en esta rama.
- **Dependencias:** se agrega la extensión `unaccent` de Postgres en prod. Es una extensión estándar del core, ya presente en dev.
- **Infraestructura:** el ensayo toma locks breves (`ALTER TABLE`) sobre `customers`, `assistance` y `membership_payments`. Con ~500 clientes y ~11.400 asistencias, cada sentencia corrió en decenas de milisegundos contra prod.

## Lecciones aprendidas

- **Un gate de UI no es un gate de schema.** Era tentador razonar "nadie tiene `v2_access` en prod, entonces la v2 no puede romper nada". El flag protege las pantallas; las migraciones y el código compartido son globales. La protección real viene de la disciplina de compatibilidad, no del flag.

- **La falla más peligrosa era la que no fallaba.** De los tres flujos rotos, el listado de clientes era el peor precisamente porque `searchAllCustomers` atrapa el error y devuelve lista vacía — una degradación pensada para que un fallo de Supabase no tire la página, que acá habría convertido "falta una vista" en "no hay clientes". **Un catch que degrada esconde tanto los errores transitorios como los estructurales.**

- **El diff de schema entre entornos es barato y debería ser rutina.** Comparar relaciones y columnas de prod contra dev tomó dos queries y produjo la lista exhaustiva del delta — 2 relaciones y 4 columnas — más el dato que más tranquilizó: **no hay un solo objeto en prod que dev no tenga**, o sea que no hay divergencia acumulada, prod es un subconjunto limpio.

- **Diffear relaciones y columnas no alcanza: faltaban las funciones.** La primera verificación comparó tablas, vistas y columnas, y concluyó "prod es un subconjunto limpio de dev". La conclusión era correcta pero la evidencia estaba incompleta — se completó al diffear también `pg_proc` (dev tiene 6 funciones de más: el helper del flag y las de `unaccent`; ninguna existe sólo en prod). **Un diff de schema que omite funciones, triggers o policies no es un diff de schema.** Lo destapó una repregunta de Ema sobre el alcance del `NOT NULL`, no la verificación propia.

- **Un `NOT NULL` obliga a auditar los escritores, no sólo los datos.** Que haya 0 nulos hoy prueba que la migración *aplica*, no que ningún camino intente escribir uno. Auditando los RPC aparecieron **dos overloads** de `upsert_customer_membership_with_payment`: el de 14 parámetros valida y corta con `MISSING_PAYMENT_METHOD`, pero el legacy de 10 —que es el que llama el alta de cliente— escribe `COALESCE(p_payment_type, 'efectivo')` sin guarda. No hay regresión, porque `COALESCE` nunca produce `NULL` y `'efectivo'` ya violaba el CHECK antes. Pero el residuo quedó anotado en el plan v2 para la Fase 7: **cerrar el defecto en la columna no lo cierra en las funciones que escriben esa columna.**

- **DDL transaccional convierte "esperemos que funcione" en evidencia.** Ensayar contra los datos reales y hacer rollback es la diferencia entre creer que una migración aplica y saberlo. Cuesta segundos y debería ser parte del procedimiento, no una técnica que alguien recuerda.

## Plan

### Pasos

1. Auditar el gate de `v2_access`: dónde se aplica, si falla abierto o cerrado, y quién tiene el flag en cada entorno.
2. Diffear el schema de prod contra dev — relaciones, columnas **y funciones** — para obtener el delta exhaustivo.
3. Mapear cada objeto del delta al código que lo consume, separando v1 de v2.
4. Clasificar las 6 migraciones pendientes contra la taxonomía de `workflow.md` y determinar el orden de deploy.
5. Ensayar la secuencia completa contra producción dentro de `BEGIN … ROLLBACK`, con `lock_timeout` corto.
6. Verificar que producción quedó intacta tras el rollback.
7. Automatizar el ensayo en `scripts/rehearse-migrations.sh` y engancharlo en `docs/workflow.md`.

### Evidencia del ensayo

Secuencia completa corrida contra **producción** el 2026-09-17, dentro de una transacción revertida:

| Migración | Resultado |
|---|---|
| `20260817111834` user_feature_flags | OK |
| `20260819170000` customer_search_unaccent | OK |
| `20260916150000` birth_date + notes | OK |
| `20260916183000` last_assistance + vista | OK — `UPDATE 315` de backfill |
| `20260917120000` payment_method obligatorio | OK — guarda de precondición pasó |
| `20260917120100` asistencia única por día | OK — `DELETE 28`, `UPDATE 31`, índice creado |

Todas las sentencias en decenas de milisegundos. Verificación post-rollback contra prod: **0 objetos nuevos, 0 columnas nuevas, extensión no creada, 11.405 asistencias intactas, tabla de migraciones sin cambios (`20260729150049`)**.

### Procedimiento de release

1. Mergear el PR [#55](https://github.com/EmaCrzz/actitud-bo/pull/55) (trae las migraciones `20260917120000` y `20260917120100`).
2. `./scripts/rehearse-migrations.sh prod` — tiene que decir "Ensayo OK".
3. `psql "$SUPABASE_DB_URL_PROD" -f supabase/scripts/audit-integrity.sql` — guardar la salida como estado previo.
4. `npm run db:push-prod`.
5. `./scripts/release.sh patch` desde `develop`.
6. Re-correr la auditoría: los bloques 2 y 3 tienen que dar 0.
7. Smoke test en producción de los tres flujos que estaban en riesgo: búsqueda para registrar asistencia, listado de clientes, y buscador del listado.

### Fuera de alcance

- **El literal `'efectivo'` dentro del overload legacy de `upsert_customer_membership_with_payment`.** Residuo del Defecto C que la migración de columna no cubre. No es regresión ni riesgo del release — existe igual en dev y prod, y `COALESCE` nunca produce `NULL` — pero el camino de falla sigue vivo: un alta con "pagó" tildado y forma de pago vacía falla. Tocar ese RPC es "cambiar el comportamiento de una función que el código ya usa", y el alta es la **Fase 7**, que además tiene que decidir si migra al overload de 14 params. Anotado en el plan v2.
- **Brecha B5 (DNI único).** Sigue abierta; requiere decisión caso por caso sobre 8 pares.
- **Automatizar la aplicación de migraciones en CI.** Hoy `db:push-prod` es manual y deliberadamente confirmado. Automatizarlo es una decisión propia; el ensayo lo hace más seguro sin cambiar quién aprieta el botón.
