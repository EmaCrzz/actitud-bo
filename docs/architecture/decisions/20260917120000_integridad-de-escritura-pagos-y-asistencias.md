# Integridad de escritura: método de pago obligatorio y una asistencia por día

**Fecha:** 2026-09-17
**Autor:** emanuel@getlenk.com
**Rama:** fix/integridad-escrituras-db

## Descripción

Dos defectos de integridad que el plan v2 venía arrastrando anotados y sin cerrar: el **Defecto C** (el `DEFAULT` inválido de `membership_payments.payment_method`) y la **brecha B4** (nada impide dos asistencias del mismo cliente el mismo día). Ninguno de los dos depende del Figma, y los dos tocan tablas que la Fase 8 — el flow de pagos, ahora adelantado — va a escribir.

Se tomaron juntos porque son el mismo tipo de problema: **la base acepta escrituras que el negocio considera imposibles**, y en ambos casos la única defensa que existía vivía en la capa de aplicación.

El disparador fue que la Fase 7 quedó bloqueada por un hueco de diseño (ver `docs/v2/PLAN.md`, decisión abierta #15), lo que liberó la ventana para cerrar deuda que no depende del diseñador.

### Defecto C — `payment_method` con un default que su propio CHECK rechaza

```sql
payment_method varchar DEFAULT 'efectivo'
  CHECK (payment_method IN ('PAYMENT_CASH','PAYMENT_TRANSFER'))
```

Verificado en producción: cualquier `INSERT` que omita la columna toma `'efectivo'`, viola el CHECK y falla. El camino de falla no es teórico — `CreateMembershipPaymentData.payment_method` era opcional y `POST /api/accounting/payments` castea el body crudo a ese tipo **sin validación runtime**, así que un POST sin el campo llega a la base. No se rompió todavía porque los call sites actuales siempre mandan el método (282 pagos en prod, 0 nulos).

### Brecha B4 — asistencias duplicadas

Las dos UIs ya lo previenen (`hasAssistanceToday` deshabilita el botón en el modal v2 y en la pantalla v1) y el RPC de primera asistencia devuelve `ASSISTANCE_ALREADY_EXISTS`. Las tres son validaciones **check-then-insert**: dos requests concurrentes las atraviesan. Y `createAssistance` es un `INSERT` pelado sin chequeo previo. Medido: **28 filas sobrantes en 25 días, 21 clientes**, idéntico en dev y prod.

## Decisiones

### Decisiones de negocio

- **No existe un medio de pago por defecto.** Se descartó cambiar el `DEFAULT` a `'PAYMENT_CASH'` (que arreglaría el CHECK) porque suponer efectivo ante la ausencia del dato inventa información contable. El método de pago es un hecho del negocio; si no vino, la escritura tiene que fallar.
- **En un duplicado se conserva la primera asistencia del día.** Es el check-in real; las posteriores son el mismo registro repetido por doble submit o doble escaneo.
- **Se corrige también la deriva preexistente de `assistance_count`**, no sólo la que causa esta limpieza. Ver "Lecciones aprendidas".

### Decisiones técnicas

- **`DROP DEFAULT` + `SET NOT NULL`, no sólo `DROP DEFAULT`.** Este es el punto no obvio de todo el cambio. Un CHECK pasa cuando su expresión no es `FALSE`, y `NULL = ANY(ARRAY[...])` devuelve `NULL`:

  ```sql
  SELECT NULL::text = ANY(ARRAY['PAYMENT_CASH','PAYMENT_TRANSFER']);  -- NULL, no FALSE
  ```

  Sacar sólo el default habría convertido un **500 ruidoso** en una **fila con `NULL` en silencio** — estrictamente peor, y del mismo perfil que el bug de fechas del ADR [20260709153000](20260709153000_representacion-canonica-de-fechas-ar.md): nada se rompe, sólo descuadra el desglose "Efectivo / Transferencias" de ingresos y del Balance.

- **El índice de asistencia usa la zona nombrada, no un offset fijo.** El día tiene que ser el calendario argentino: una asistencia de las 22hs AR es 01:00 UTC del día siguiente, así que indexar `assistance_date::date` dejaría pasar el duplicado justo en el horario pico. Postgres exige expresiones `IMMUTABLE` en un índice, y acá la intuición falla:

  ```sql
  (assistance_date - interval '3 hours')::date                     -- ✗ rechazado
  (assistance_date AT TIME ZONE 'America/.../Buenos_Aires')::date  -- ✓ aceptado
  ```

  El atajo del offset falla porque `timestamptz::date` es `STABLE` (depende del `TimeZone` de sesión). La forma idiomática funciona porque `timezone(text, timestamptz)` — en la que desazucara `AT TIME ZONE` con zona nombrada — está marcada `IMMUTABLE`; es la forma de *un* argumento la que es `STABLE`. Verificado contra `pg_proc` en dev.

- **Tres capas para el duplicado, cada una con su rol.** La UI previene (botón deshabilitado), el índice garantiza, y `isDuplicateAssistanceError` traduce el `23505` a `assistance.alreadyRegisteredToday` — copy que ya existía en el diccionario. Sin esa traducción el constraint nuevo habría empeorado la UX: el handler mostraba `error.message` crudo de Postgres.

- **El helper vive en `assistance/utils.ts`, no en `api/client.ts`.** La capa de API no conoce el diccionario de i18n; el helper devuelve un booleano y cada UI elige su mensaje. Lo consumen los dos call sites (modal v2 y pantalla v1) sin duplicar el código del check.

- **`payment_method` pasa a requerido en TypeScript.** `UpdateMembershipPaymentData extends Partial<...>`, así que los updates siguen pudiendo omitirlo. `type-check` pasó sin tocar ningún call site, lo que confirma que todos ya lo mandaban.

- **Dos migraciones, no una.** Son defectos independientes en tablas distintas; separarlas las hace revisables y revertibles por separado.

## Consideraciones de seguridad

- **Autenticación / Autorización:** sin cambios. No se tocó ninguna policy de RLS ni ningún guard de permisos.
- **Exposición de datos:** ninguna. Las dos migraciones restringen escrituras; no amplían lectura.
- **Validación de input:** **mejora.** `POST /api/accounting/payments` sigue sin validación runtime del body — eso queda como deuda anotada abajo — pero ahora el `NOT NULL` ataja en la base el campo que el cast de TypeScript no verificaba. El índice UNIQUE cierra de la misma forma la ventana de carrera del registro de asistencia.
- **Dependencias:** ninguna nueva.
- **Infraestructura:** sin cambios de red ni de permisos.

### Deuda de seguridad que este cambio deja anotada

`POST /api/accounting/payments` castea `await request.json()` a `CreateMembershipPaymentData` y lo inserta sin validar. El `NOT NULL` tapa el caso que motivó esta migración, pero el endpoint sigue confiando en la forma del body para todo lo demás. Un esquema de validación runtime en esa ruta es un cambio propio.

## Lecciones aprendidas

- **Un `DROP DEFAULT` "obvio" habría empeorado el bug.** El defecto estaba anotado en el plan como "arreglar el default que viola el CHECK", y la lectura literal de esa nota produce exactamente el cambio equivocado. Lo que lo destapó fue preguntarse *qué pasa después del fix* — y encontrar que el CHECK no rechaza `NULL`. **Antes de relajar una restricción, verificar qué escritura queda permitida, no sólo cuál deja de fallar.**

- **La expresión idiomática era la indexable y el "atajo" no.** Se probó primero el offset fijo (`- interval '3 hours'`) asumiendo que la zona nombrada no sería `IMMUTABLE`. Es al revés. Vale verificar la volatilidad en `pg_proc` en vez de razonarla — son dos minutos y la intuición falla.

- **El recomputo destapó una deriva preexistente que nadie estaba buscando.** Al validar la migración en dev apareció que el `UPDATE` tocaba **30** filas, no las 21 esperadas. Investigando: **12 clientes en prod (11 en dev) ya tenían `assistance_count` desalineado** antes de esta limpieza — 11 de más y 1 de menos. Los de más son asistencias borradas alguna vez que el trigger `AFTER INSERT` nunca descontó; el de menos es un insert anterior al trigger. **Toda columna denormalizada mantenida por trigger deriva con el tiempo**; conviene un chequeo periódico, o al menos recomputar cada vez que se la toca.

- **Una migración de datos tiene dos fechas, y no son la misma.** La fecha en que se mide el entorno y la fecha en que se aplica a producción están separadas por semanas, porque `db:push-prod` es manual. Una migración escrita contra el estado medido (una lista de ids, un conteo fijo) envejece mal; una escrita contra la *forma* del problema (`row_number` sobre una partición, `count(*)` sobre la tabla) no. La primera de las dos migraciones de este ADR ya era así por casualidad; la segunda necesitó una guarda explícita. **Regla para las que vengan: si la migración no se puede correr dos veces con meses de diferencia y hacer lo correcto ambas veces, le falta una guarda o le sobra un dato hardcodeado.**

- **Medir antes de proponer cambió el alcance dos veces en la misma sesión.** El mismo tipo de conteo que acá confirmó que B4 era barata (28 filas, regla obvia) mostró que la brecha B5 —el DNI único, que a priori parecía igual de simple— **no** lo era: uno de los 8 pares duplicados son dos personas distintas con un DNI mal tipeado, y varios tienen historial de los dos lados. B5 salió del alcance por eso.

## Plan

### Pasos

1. Verificar el Defecto C contra producción: `column_default`, la definición del CHECK y la distribución real de valores.
2. Comprobar empíricamente que `NULL` pasa el CHECK, y relevar los call sites que pueden omitir el campo.
3. Migración `20260917120000`: `DROP DEFAULT` + `SET NOT NULL` + `COMMENT`. Precondición verificada: 0 nulos en dev y prod.
4. Hacer `payment_method` requerido en `CreateMembershipPaymentData`.
5. Probar en dev qué expresión de día-AR acepta un índice; confirmar la volatilidad en `pg_proc`.
6. Migración `20260917120100`: DELETE de duplicados conservando el primero del día, recomputo de `assistance_count`, y el índice UNIQUE.
7. `isDuplicateAssistanceError` en `assistance/utils.ts` + wiring en el modal v2 y en la pantalla v1, reusando `assistance.alreadyRegisteredToday`.
8. Verificación: `type-check`, `lint` (22 warnings / 0 errores, baseline de `develop`, ninguno en los archivos tocados) y las dos migraciones aplicadas en dev dentro de una transacción con `ROLLBACK`.

### Verificación de las migraciones

Corridas contra la base de dev dentro de `BEGIN … ROLLBACK`, sin dejar cambios:

| Qué | Resultado |
|---|---|
| Las dos migraciones aplican en orden | `ALTER`/`ALTER`/`COMMENT`, `DELETE 28`, `UPDATE 30`, `CREATE INDEX` |
| Duplicados restantes tras la limpieza | 0 |
| Contadores desalineados tras el recomputo | 0 |
| Filas totales de `assistance` | 11.328 → 11.300 (−28, lo esperado) |
| Rollback limpio | sin cambios persistidos |

### Riesgo de timezone

**Esta migración no escribe ninguna fecha nueva.** El único punto donde la zona horaria importa es la expresión del índice, que deriva el día calendario argentino con la zona nombrada — auditado arriba en "Decisiones técnicas". El `DELETE` agrupa con esa misma expresión, así que la limpieza y la garantía usan exactamente el mismo criterio de "día": si difirieran, el índice podría rechazar filas que la limpieza consideró distintas.

### Aplicación en producción — el desfase entre medir y aplicar

Planteado por Ema al revisar el cambio: **estas migraciones se escribieron midiendo los datos del 2026-09-17, pero `db:push-prod` es un paso manual** (no hay CI que aplique migraciones; el deploy de código va por Vercel desde `main` y es independiente). Entre la medición y la aplicación, prod sigue operando. El estado que justificó la migración no es necesariamente el estado al aplicarla.

Cómo queda resuelto, punto por punto:

- **`20260917120100` (asistencias) es data-independent por construcción.** No borra una lista de ids: usa `row_number() OVER (PARTITION BY customer_id, día_AR)` sobre toda la tabla, y el recomputo hace `count(*)` sobre toda la tabla. Limpia los duplicados que existan al momento de correr, sean 28 o 300. El índice se crea después del DELETE, así que no puede fallar por datos viejos. **No requiere ninguna acción previa.**

- **`20260917120000` (pagos) sí tenía una precondición dependiente de datos** — `SET NOT NULL` exige 0 nulos — y por eso se le agregó una **guarda explícita**: un bloque `DO` que cuenta nulos y aborta con un mensaje accionable antes de tocar nada. Sin ella, un `NULL` aparecido en el medio habría abortado el push con un error críptico de Postgres a mitad de deploy. El caso no es hipotético: se verificó insertando un pago con `payment_method NULL` en dev — **entró sin problema**, porque el CHECK no rechaza nulos. Si eso pasa, la resolución es manual a propósito: no hay backfill correcto para el medio de pago de un cobro real.

- **La medición se volvió repetible.** [`supabase/scripts/audit-integrity.sql`](../../../supabase/scripts/audit-integrity.sql) es un script de sólo lectura que reporta los cinco indicadores (pagos sin método, asistencias duplicadas, deriva de `assistance_count`, DNIs duplicados y clientes sin membresía) contra el entorno que se le pase. Reemplaza el número anotado una vez en un ADR por algo que se puede correr antes de cada push, después para confirmar, y periódicamente. Sirve igual para la brecha B5, que sigue abierta.

- **Estas migraciones no dependen de la v2 y no deberían esperarla.** Arreglan defectos de **v1**: el flow de pagos y el de asistencias que están en producción hoy. Como la v2 viaja apagada detrás del flag `v2_access`, `develop` → `main` sigue liberando normalmente, y estas dos pueden aplicarse a prod en el próximo release en vez de quedar atadas al cronograma del rediseño. Conviene: cada semana que pasa, prod acumula más duplicados.

**Procedimiento para el push a prod:**

1. Correr `psql "$SUPABASE_DB_URL_PROD" -f supabase/scripts/audit-integrity.sql` y mirar el bloque 1. Si hay pagos con método nulo, resolverlos a mano primero.
2. **Deployar el código primero, la migración después** — regla de orden ya establecida en el proyecto. Si se aplica el índice antes de que el código nuevo esté arriba, un duplicado en la ventana intermedia le muestra al operador el error crudo de Postgres en vez del mensaje traducido.
3. `npm run db:push-prod`.
4. Volver a correr la auditoría: los bloques 2 y 3 tienen que dar 0.

### Fuera de alcance

- **Brecha B5 (DNI único).** Requiere decidir caso por caso sobre 8 pares duplicados, uno de los cuales son dos personas distintas. PR y ADR propios.
- **Validación runtime de `POST /api/accounting/payments`.** Ver "Deuda de seguridad".
- **El trigger sigue siendo `AFTER INSERT`.** No se le agregó manejo de `DELETE`: borrar asistencias no es una operación normal de la app, y el índice previene el caso que motivaba borrarlas. Si eso cambia, el trigger necesita la contraparte.
