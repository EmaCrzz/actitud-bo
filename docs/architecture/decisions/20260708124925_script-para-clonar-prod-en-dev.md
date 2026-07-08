# Script `db:restore-dev` para clonar la DB de PROD en DEV

**Fecha:** 2026-07-08
**Autor:** emanuel@getlenk.com
**Rama:** feat/db-restore-dev-script

## Descripción

Hasta ahora no había una forma reproducible de poblar el proyecto de Supabase
de **development** con datos reales del proyecto de **production**. Los devs
que trabajan sobre `develop` compartían la misma DB de dev, pero ese ambiente
podía quedar vacío, desactualizado o con estados inconsistentes tras varios
resets manuales.

Este ADR introduce [scripts/db-restore-dev.sh](../../../scripts/db-restore-dev.sh),
expuesto como `npm run db:restore-dev`, que hace un snapshot de PROD y lo
restaura de forma **idempotente** en DEV, sobrescribiendo todo el schema
`public`, las tablas de `auth`, y la tabla de migraciones.

El script cubre la operación end-to-end: dump con `supabase db dump` desde
PROD, gate de confirmación interactivo, wipe controlado del schema en DEV
via `psql`, restore en el orden correcto, y verificación de counts. Los
dumps se guardan en `backups/<timestamp>/` (gitignored).

## Decisiones

### Decisiones de negocio

- **Copiar datos reales de PROD a DEV incluyendo `auth.users`.** DEV es un
  ambiente interno consumido solo por el equipo de desarrollo, y tener staff
  reales (logueables con sus credenciales de prod) simplifica el testing de
  RLS y de flujos que dependen del rol del usuario. Se acepta que emails y
  hashes de passwords quedan copiados a un segundo proyecto Supabase — es
  aceptable mientras el círculo de acceso a DEV coincide con el de PROD.
  Si más adelante se abre DEV a terceros (contratistas, betatesters), este
  ADR queda invalidado y hay que agregar sanitización.

- **Idempotencia total: cada corrida es un reset completo.** No hay modo
  "merge" ni "solo data nueva". El único uso soportado es "quiero DEV
  idéntico a PROD ahora mismo". Cualquier estado local en DEV que no venga
  de PROD se pierde. Esto simplifica el mental model y evita drift silencioso.

- **Confirmaciones interactivas obligatorias, sin flag `--yes`.** El script
  pide `yes` dos veces: antes del dump de PROD y antes del wipe de DEV. Aunque
  el wipe no toca PROD, un `--yes` invita a scriptearlo dentro de CI o de
  otros wrappers, lo que multiplica la chance de accidentes. Preferimos
  fricción sobre velocidad.

### Decisiones técnicas

- **`supabase db dump` en vez de `pg_dump` directo.** El `pg_dump` del sistema
  (Homebrew) está en versión 14, mientras que los proyectos de Supabase corren
  Postgres 17.x actualmente, lo que hace fallar el dump con *"server version
  mismatch"*. `supabase db dump` levanta un container Docker con un `pg_dump`
  matching-version y encapsula este problema.

- **Requiere Supabase CLI >= 2.x y Docker corriendo.** La CLI v1.x usa un
  container con `pg_dump` 15 y no soporta Postgres 17 (los proyectos de
  Supabase migraron a 17 durante 2026). El script valida ambas condiciones
  al inicio y falla temprano con un mensaje accionable si Docker no está
  arriba o la CLI está desactualizada. Este es el mismo problema que puede
  aparecer más adelante si Supabase mueve a Postgres 18: el patrón queda
  documentado.

- **Session Pooler URLs (`SUPABASE_DB_URL_PROD`, `SUPABASE_DB_URL_DEV`) en
  vez de conexión directa.** La conexión directa a Supabase usa IPv6, que
  falla desde la mayoría de las redes desde 2024 (documentado en el script
  `supabase-setup.sh` existente). El Session Pooler expone IPv4. Ambas URLs
  ya viven en `.env.local`, así que reutilizamos la convención.

- **`DROP SCHEMA public CASCADE` + `TRUNCATE auth.users CASCADE` en vez
  de borrar tabla por tabla.** Postgres resuelve las dependencias de FK
  automáticamente con CASCADE, y el schema queda garantizadamente limpio
  antes del restore. Borrar tabla por tabla requiere mantener el orden en
  el script y se rompe cuando aparecen tablas nuevas.

- **Restaurar `supabase_migrations.schema_migrations` también.** Después
  del wipe, DEV está en el estado de schema de PROD. Si dejamos la tabla
  de migraciones de DEV como estaba, el próximo `npm run db:push-dev` va
  a intentar reaplicar migraciones ya aplicadas y romper. Sincronizar la
  tabla de migraciones elimina ese footgun. El dump se hace con
  `--schema supabase_migrations --data-only`; si el schema no existe (proyecto
  nuevo), el script sigue igual sin él.

- **Orden de restore importa: auth → public schema → public data → migrations.**
  `public.profile` tiene FK a `auth.users(id)`, así que los users tienen que
  existir antes de que se materialicen las tablas y filas de public. Si se
  invierte el orden, el `COPY` de public falla con violation de FK.

- **Dumps van a `backups/<timestamp>/`, gitignored.** Los archivos contienen
  emails y password hashes; nunca se pushean. El timestamp permite tener
  múltiples snapshots convivendo si el dev quiere comparar estados. No hay
  auto-cleanup por ahora — el dev limpia manualmente si el disco crece.

## Consideraciones de seguridad

- **Exposición de datos:** el dump completo de `auth.users` sale de PROD y
  queda en el filesystem local del dev que corre el script. Esos archivos
  incluyen emails de staff y hashes de passwords (bcrypt/scrypt de Supabase
  Auth). El `.gitignore` los excluye del repo, pero **cada dev es responsable
  de no compartir el directorio `backups/`** y de borrarlo cuando termina.
- **Autenticación / Autorización:** después del restore, las credenciales de
  staff de PROD funcionan en DEV. Este es el efecto buscado (testing con roles
  reales), pero implica que un dev con acceso a DEV puede impersonar a
  cualquier staff. Aceptable mientras DEV sea interno.
- **Validación de input:** el script consume solo variables de `.env.local`
  del dev y un timestamp generado localmente. No hay input externo.
- **Dependencias:** no se agrega ninguna. Se usa `supabase` CLI y `psql`
  que ya estaban en el entorno.
- **Infraestructura:** el script se conecta a PROD **solo en lectura** (dumps).
  El único vector de escritura es contra DEV. No hay forma trivial de
  invertir sin editar el script, pero un typo en `.env.local` que swapee las
  dos URLs escribiría PROD desde DEV. Vale la pena en un ADR futuro agregar
  un chequeo defensivo (por ejemplo, requerir que el project ref del
  destino coincida con un valor esperado).

## Lecciones aprendidas

- El desalineo de versiones entre `pg_dump` local y el Postgres remoto es un
  friction point silencioso. Cualquier script que dependa de `pg_dump`
  directo va a fallar en máquinas con Homebrew estándar.
- La tabla de migraciones vive en el schema `supabase_migrations`, no en
  `public`. Es fácil no verla y dejar DEV con un estado inconsistente
  después de un restore.
- **La CLI de Supabase se desactualiza rápido.** Durante la primera corrida
  del script (2026-07-08) descubrimos que la CLI 1.106.1 no soporta Postgres
  17 (que ya es la versión activa en los proyectos productivos). Hubo que
  hacer `brew upgrade supabase/tap/supabase` a la 2.109.1 para poder dumpear.
  El script ahora falla temprano con instrucciones si la CLI está atrás.
- **Docker Desktop es una dependencia oculta.** La CLI de Supabase >= 2.x
  lanza un container con Postgres matching-version para el dump. Docker
  tiene que estar corriendo. El primer pull baja ~1GB pero después queda
  cacheado; corridas siguientes son casi instantáneas.

## Plan

### Pasos

1. Crear `scripts/db-restore-dev.sh` que orqueste dump → confirmación → wipe → restore → verify.
2. Agregar `db:restore-dev` al bloque `scripts` de `package.json`.
3. Agregar `/backups/` a `.gitignore`.
4. Escribir este ADR.
5. Verificar `type-check` y `lint` (el script es bash, no toca código TS).
6. Reportar al usuario para que corra el script manualmente contra PROD/DEV.
