# Backups diarios de PROD via GH Actions y health check público

**Fecha:** 2026-07-09
**Autor:** emanuel@getlenk.com
**Rama:** feat/backups-y-health-check

## Descripción

Este ADR es la **Fase A** del plan de resiliencia rumbo a multitenant + primeros clientes. Complementa el saneamiento del workflow ([ADR 20260708111204](./20260708111204_sanear-workflow-y-agregar-disciplina-de-rollback.md)) con la infraestructura mínima para que el rollback Escenario C no dependa de recuerdos o improvisación.

El contexto real: el proyecto de Supabase de PROD está hoy en **plan Free**, que **no incluye backups automáticos de ningún tipo**. El único mecanismo hoy sería `supabase db dump` manual — que nadie corre proactivamente. Un incidente en PROD hoy = pérdida total de datos sin camino de recuperación.

La estrategia inmediata que definió el owner es ofrecer trials gratis a conocidos como fase de validación. En ese estadio, pagar los ~$140/mes de Pro + PITR es prematuro. La solución para este intervalo es **replicar el comportamiento de "daily backups" del plan Pro sin pagarlo**: un cron de GitHub Actions que corre `supabase db dump` contra PROD 1×día y guarda el output como artifact con 30 días de retención.

Adicionalmente se agrega un endpoint **`/api/health`** público que ejercita el path completo hasta la DB. Sirve para: (a) verificación rápida post-deploy y post-rollback, (b) base para el monitoring que sumemos en fases siguientes.

## Decisiones

### Decisiones de negocio

- **No pagar Supabase Pro todavía.** Con cero clientes y sin multitenant cerrado, los $25/mes (o $140/mes con PITR) es dinero que no compra riesgo real reducido. Los conocidos que participen del trial gratis tienen expectativa de reliability baja por naturaleza del setup. Cuando llegue el primer cliente pago, se upgrade a Pro.

- **Aceptar RPO de hasta 24hs mientras dure la fase de validación.** En el peor caso (incidente 1 minuto antes del backup diario), se pierden 24hs de datos. Para conocidos usando el sistema de forma casual, es tolerable. Documentado explícitamente en el Escenario C del workflow para que no haya sorpresa cuando pase.

- **Retención de 30 días en artifacts.** Cubre incluso incidentes que se descubren varios días después ("el número de esta semana no cuadra con los del mes pasado"). Más allá de 30 días, si el problema no salió, ya es remediación con SQL, no rollback.

- **No implementar PITR ni upgrade a Pro en este ADR.** Se separa a Fase C explícitamente (cuando exista primer cliente pago). Este ADR es solo la red gratuita que aguanta la fase de trials.

### Decisiones técnicas

- **GitHub Actions cron en vez de servicio externo.** Alternativas evaluadas: Vercel Cron (no soporta jobs largos de dump), servicio dedicado tipo AWS EventBridge + Lambda (costo + setup), self-hosted en máquina local (fragilidad de disponibilidad). GH Actions es gratis para repos privados hasta 2000 min/mes, no requiere infra nueva, y el estado del backup queda visible en la misma UI donde vive el resto del deploy.

- **Almacenamiento en GitHub Artifacts, no en un bucket externo.** Alternativas: Cloudflare R2 free tier, AWS S3, Backblaze B2. Todos requieren gestionar credenciales, bucket policies, lifecycle rules, y monitorear costos. GH Artifacts está incluido con el repo, integrado con Actions, y con retención configurable per-artifact. La contrapartida es que si se pierde acceso al repo se pierden los backups — aceptable dado que el mismo repo tiene el código productivo. Cuando llegue Pro + PITR, el cron pasa a ser red secundaria y este trade-off queda irrelevante.

- **Retención de 30 días en el artifact, cron 1×día a las 03:00 AR (06:00 UTC).** Ventana de baja actividad, RPO máximo de 24hs, cobertura de un mes hacia atrás. El cron usa formato UTC estándar; Argentina no cambia horario, así que la conversión es estable.

- **Session Pooler URL como secret (`SUPABASE_DB_URL_PROD`), no service key + project ref.** Reusa el mismo mecanismo que ya está en `.env.local` para `db:push-prod` y `db:restore-dev`. Mantiene un solo secret que hay que rotar si se compromete, en vez de dos (access token + project ref). El pooler ya está probado con `supabase db dump` en el script `db-restore-dev.sh`.

- **`supabase/setup-cli@v1` con `version: latest`.** Se prefiere sobre `curl | tar` para simplicidad. `latest` en vez de pin específico porque un breaking silencioso en la CLI es preferible a un pin obsoleto que oculte una regresión de la matching-version con Postgres. Si el update rompe el workflow, se pinnea reactivamente.

- **Dump partido en 3 archivos** (`schema`, `data`, `migrations`) igual que `db-restore-dev.sh`. Consistencia con el proceso de restore que ya se probó localmente; permite restaurar solo una parte si el incidente lo permite; el ADR de `db:restore-dev` documenta por qué el orden importa (auth → public → migrations por FKs).

- **Sanity check de tamaño mínimo (512 bytes).** Un dump "exitoso" pero silenciosamente vacío es el peor caso — pensás que tenés backup, no lo tenés. El check no es infalible (un dump legítimamente chico también dispararía el warning), pero funciona como señal temprana.

- **Health check en `/api/health` sin auth, sin exponer detalles de error.** Cualquier sistema de monitoring externo (Vercel deploy check, UptimeRobot, Better Uptime) necesita accederlo sin credenciales. La response solo indica `ok/fail` por check y latencia total — no filtra strings de error de Postgres, IPs internas, ni versiones. El query real es un `select id from customers limit 1`: fuerza round-trip a Postgres, no depende de RPCs custom, y con RLS anon no expone datos.

- **`export const dynamic = 'force-dynamic'`** en el route handler. Sin esto, Next 15 podría cachear la respuesta y responder "ok" desde caché aunque la DB esté caída. El health check tiene que ejercitar el path cada vez que se lo llama.

### Alternativas descartadas

- **Correr el dump desde la máquina del owner con cron local.** Descartado — depende de que la laptop esté encendida y con conectividad. Fragilidad inaceptable para "único mecanismo de backup".
- **Backup también contra DEV.** Descartado explícitamente por el owner después de aclarar la diferencia con `db:restore-dev`. DEV es rehidratable desde PROD en cualquier momento; hacer backups de DEV es consumo de cuota sin valor.
- **Cifrar el dump antes de subirlo al artifact.** Descartado por complejidad. El repo es privado, GH Artifacts hereda esa privacidad. Cuando pase a un bucket externo, se reevalúa cifrado en reposo (probablemente ya venga del provider).
- **PITR nativo de Supabase.** Descartado hasta Fase C por precio.
- **Endurecer `db:restore-dev` con approval en Actions.** Descartado para esta fase por decisión del owner ("dejalo para después"). Ver followup abajo.

## Consideraciones de seguridad

- **Exposición de datos:** el artifact contiene el dump completo de PROD, incluidos `auth.users` con emails y hashes de passwords. Está guardado en GitHub Artifacts del repo privado, accesible solo a colaboradores del repo. Se aplica la misma consideración del ADR de `db:restore-dev` (ADR 20260708124925): quien tiene acceso al repo puede impersonar cualquier staff descargando el artifact y restaurando local. Aceptable mientras el círculo de acceso al repo coincide con el de PROD.

- **Autenticación / Autorización del health check:** el endpoint `/api/health` está deliberadamente sin auth. El query hace `select id from customers limit 1` con la anon key; RLS puede devolver array vacío o error específico, pero en ambos casos el endpoint responde `ok` (la DB anda). No hay leak de row data porque solo miramos si hubo error de conexión, no el contenido.

- **Validación de input:** el endpoint no acepta input. El workflow acepta solo variables de secrets configuradas manualmente en GitHub. Sin superficie de inyección.

- **Dependencias nuevas:** `supabase/setup-cli@v1` (action mantenida por Supabase) y `actions/upload-artifact@v4` (mantenida por GitHub). Ambas son de proveedores directos, con historial de seguridad razonable.

- **Infraestructura:**
  - El cron se conecta a PROD **solo en lectura** (dumps), como el `db-restore-dev.sh`.
  - El endpoint `/api/health` corre en las Serverless Functions de Vercel y usa el mismo Supabase server client que el resto de la app — sin nueva superficie de red.
  - El secret `SUPABASE_DB_URL_PROD` en GitHub Actions es el mismo Session Pooler URL que ya usa el owner en `.env.local`. Rotarlo requiere: (1) resetear la password de la DB de Supabase, (2) actualizar `.env.local` y (3) actualizar el secret en GitHub. Documentar el paso 3 explícitamente en la próxima sesión que toque este ADR.

## Lecciones aprendidas

- **El plan Free de Supabase no tiene ningún backup automático.** No es "backups con menos retención" — es cero backups. Descubrirlo el día del incidente sería una catástrofe. Vale la pena esta capa aunque sea manual/artesanal.
- **Reusar mecanismos existentes reduce complejidad y riesgo.** El script `db-restore-dev.sh` ya validó `supabase db dump` + Session Pooler + Docker + CLI 2.x. Este workflow es esencialmente el mismo dump en un runner de GH, sin reinventar.

## Plan

### Pasos

1. Crear rama `feat/backups-y-health-check` desde `develop`.
2. Explorar patrón existente de API routes y del Supabase server client para no divergir de la convención.
3. Crear `.github/workflows/db-backup-prod.yml` con cron diario, dump partido en 3, upload artifact retención 30d.
4. Crear `src/app/api/health/route.ts` con check de DB (query mínimo a `customers`).
5. Actualizar `docs/workflow.md`:
   - Reescribir Escenario C para reflejar la fuente real del backup (GH Actions, no PITR).
   - Nueva sección "💊 Restore desde un dump" con proceso end-to-end (descargar artifact → wipe → restore → verify).
   - Referencia al health check en "URLs de Monitoreo".
6. Crear este ADR.
7. `npm run type-check` y `npm run lint`.
8. Reportar al owner con checklist de acciones fuera-de-repo:
   - Agregar secret `SUPABASE_DB_URL_PROD` en GitHub Settings → Secrets and variables → Actions.
   - Correr el workflow manualmente 1 vez desde la UI para validar que anda antes de esperar el primer cron.
   - Probar `/api/health` local antes de mergear.

### Trabajo futuro (followups)

- **Endurecer `db:restore-dev` con approval manual en GH Actions.** Idea del owner en la conversación de arranque de Fase A. Un workflow programado (semanal) que corra `db:restore-dev` **solo con approval manual** en GitHub, dejando trail de "quién rehidrató DEV cuándo". Vale la pena cuando entren más devs al proyecto y/o cuando queramos automatizar la refresh semanal de DEV. Fase separada.

- **Fase B (multitenant).** Blocker real para tener clientes reales. No es infra sino producto, y es lo próximo priorizado por el owner.

- **Fase C (Pro + PITR).** Al firmar primer cliente pago o al llegar a 3 conocidos activos, upgrade a Pro ($25/mes) para backups oficiales. PITR ($100/mes extra) se suma cuando la data justifique el RPO de 2 minutos (probablemente al llegar a 3+ clientes o cuando manejemos plata real).

- **Monitoring externo del health check.** Sumar UptimeRobot / Better Uptime / Cronitor que pingueen `/api/health` cada 1-5 min y avisen a Slack/Telegram si falla. Free tier de esos servicios cubre este caso.

- **Verificación periódica de que los dumps son restaurables.** Un backup que no se testeó no existe. Una posible cadencia: 1×mes correr un smoke test que restaura el último dump en un proyecto Supabase efímero y valida counts. Fase B/C.
