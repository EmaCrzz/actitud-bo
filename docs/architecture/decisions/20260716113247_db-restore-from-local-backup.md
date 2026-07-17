# Restore de DEV desde backup local (`--from-backup`)

**Fecha:** 2026-07-16
**Autor:** emanuel@getlenk.com
**Rama:** feat/db-restore-from-backup

## Descripción

`scripts/db-restore-dev.sh` sólo soportaba un flujo: dumpear PROD en el momento y restaurar en DEV. Cuando ya tenemos un backup de PROD generado por otro medio (por ejemplo, el backup descargado a `~/Downloads/db-backup-prod-*/` con los tres archivos `schema_*.sql`, `data_*.sql`, `migrations_*.sql`), no podíamos reutilizarlo sin ejecutar otra vez el dump — lento y con el riesgo de que el snapshot cambie respecto al que ya se validó offline.

Se extiende el script con un modo `--from-backup <dir>` que saltea el dump y aplica los tres archivos del backup local sobre DEV, respetando el mismo contrato destructivo del modo original (DROP `public`, TRUNCATE de `auth`/`storage`/`schema_migrations`).

## Decisiones

### Decisiones de negocio

- Reusar el script `db:restore-dev` existente en vez de crear uno nuevo. La operación destructiva es la misma; sólo cambia el origen del dump.
- Mantener el modo default intacto: los usuarios que ya lo usan no ven ningún cambio de comportamiento sin pasar el flag.

### Decisiones técnicas

- **Formato de backup soportado**: exactamente un archivo por patrón (`schema_*.sql`, `data_*.sql`, `migrations_*.sql`) en el directorio. El data file es un dump combinado de `auth` + `public` + `storage`, tal como lo genera el pipeline actual de backups.
- **Wipe más agresivo que el modo original**: como el data file incluye `storage.*` y varias tablas de `auth` que el TRUNCATE original no tocaba (por ejemplo `auth.audit_log_entries`), el nuevo modo trunca *todas* las tablas de `auth` y `storage` iterando `pg_tables`. Sin esto, el restore fallaría por conflictos de PK sobre filas preexistentes.
    - Alternativa descartada: enumerar tablas a mano — frágil frente a cambios de versión de Supabase.
- **Skip de tablas internas del servicio**: `auth.schema_migrations`, `storage.migrations`, `storage.buckets_vectors`, `storage.vector_indexes` son propiedad de roles como `supabase_auth_admin`/`supabase_storage_admin` — el rol `postgres` (con el que conectamos vía Session Pooler) no tiene permiso de TRUNCATE sobre ellas. El loop las skipea con `EXCEPTION WHEN insufficient_privilege` y emite un `RAISE NOTICE`. No vienen en el backup, así que no hay que restaurarlas tampoco.
- **Orden de aplicación**: schema → data → migrations. El data trae `SET session_replication_role = replica` para bypass de FKs, así que el orden dentro del data (auth, luego public, luego storage) no requiere pre-configuración.
- **Sin cambios en el flow de dependencias**: en modo `--from-backup` sólo se requiere `psql`. Se saltea la validación de `supabase` CLI y Docker (necesarias sólo para dumpear).
- **Validación temprana**: si hay 0 o >1 archivos matching un patrón, el script falla antes de tocar la DB. Esto evita restores ambiguos o parciales.

## Consideraciones de seguridad

- **Autenticación / Autorización:** en modo `--from-backup` se reemplazan `auth.users` y tablas relacionadas de DEV por las de PROD. Después del restore, loguearse en DEV/preview requiere credenciales de PROD. Sin cambios en la superficie de auth de la app.
- **Exposición de datos:** el backup contiene PII (emails y hashes de passwords de staff). El script no lo mueve fuera del entorno local — sólo lo lee del disco del dev y lo escribe en el proyecto de DEV en Supabase. Los archivos del backup viven fuera del repo (Downloads), no se agregan a git.
- **Validación de input:** el path del backup viene del CLI; se valida que sea un directorio y que contenga exactamente un archivo por patrón. Los `.sql` se aplican con `psql -f`, que interpreta el archivo tal cual — quien pase un backup manipulado puede ejecutar SQL arbitrario en DEV, pero el vector requiere acceso al filesystem del dev y a las credenciales de DEV, así que no amplía superficie más allá del acceso ya existente.
- **Dependencias:** ninguna nueva.
- **Infraestructura:** el script apunta a `SUPABASE_DB_URL_DEV` (Session Pooler). Sigue mostrando el host antes del confirm destructivo, para que el operador vea sobre qué proyecto va a impactar.

## Lecciones aprendidas

- La primera corrida falló en el wipe con `permission denied for table auth.schema_migrations`. Ese TRUNCATE se ejecutó *después* del DROP `public`, dejando DEV en estado intermedio (schema public dropeado + varias tablas de `auth` truncadas). La corrida siguiente con el fix del `EXCEPTION` completó el restore sin secuelas — el wipe es idempotente sobre el estado intermedio.
- Los NOTICE del RAISE (`skip auth.schema_migrations`, `skip storage.migrations`, `skip storage.buckets_vectors`, `skip storage.vector_indexes`) son parte del output normal, no errores.

## Plan

### Pasos

1. Rama `feat/db-restore-from-backup` desde `develop`.
2. Extender `scripts/db-restore-dev.sh`:
   - Agregar parsing de `--from-backup <dir>` (y `-h/--help`).
   - Ajustar `load_env` y `check_tools` para no exigir PROD ni supabase/docker en el nuevo modo.
   - Añadir helper `resolve_backup_file` que resuelve un único archivo por glob.
   - Bifurcar la lógica: modo `--from-backup` ejecuta wipe (extendido) + apply schema + apply data + apply migrations + verificación, y sale.
   - Modo default queda intacto.
3. `bash -n scripts/db-restore-dev.sh` para validar sintaxis y smoke test cancelado (respondiendo "no" al confirm) para verificar parsing.
4. Documentar el nuevo modo en este ADR.
5. Restaurar en DEV el backup `db-backup-prod-20260716_065010Z` con `npm run db:restore-dev -- --from-backup <path>` (fuera de este commit).
