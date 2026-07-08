# Sanear workflow doc y establecer disciplina de rollback

**Fecha:** 2026-07-08
**Autor:** emanuel@getlenk.com
**Rama:** chore/sanear-workflow-docs

## Descripción

El proyecto se encamina hacia multitenant + salida al mercado con clientes pagos. En una conversación previa quedó claro que la percepción de "rollback como un botón" no matcheaba con la realidad del setup actual: la documentación (`WORKFLOW.md`) prometía cosas que no eran ciertas y sugería comandos peligrosos o directamente imposibles de ejecutar.

Este ADR documenta la **Fase 0** de un plan más grande para llegar a un flujo de deploy/rollback confiable antes de tomar clientes pagos. Fase 0 es puro saneamiento de documentación — no toca código, infra ni proceso real (más allá de dejarlo escrito con precisión). Las fases siguientes (PITR, health checks, CI para migraciones, etc.) se implementarán en ADRs propios.

### Problemas específicos detectados en la doc

1. **`WORKFLOW.md:211`** afirmaba "Rollback fácil - Cada migración es reversible". Falso: el CLI de Supabase no genera down migrations, y no existe ninguna en `supabase/migrations/`. En un incidente real, esa afirmación daba falsa seguridad.

2. **`WORKFLOW.md:383-397`** (sección "Rollback de Emergencia") sugería `git reset --hard v1.1.0 && git push --force`. Este comando:
   - Contradice `CLAUDE.md` que prohíbe `--force` sin pedido explícito.
   - Está bloqueado por la branch protection configurada en el ADR [20260706170431](./20260706170431_proteger-main-y-cambiar-default-branch.md) (`allow_force_pushes = false`).
   - No mencionaba Vercel Instant Rollback, que es el path real, seguro y ya disponible.

3. **`WORKFLOW.md:78-93`** (sección "Deploy a Production") describía un merge manual `develop → main`, contradiciendo la sección "Protección de main" del mismo doc que aclara que el único camino válido es `release.sh`. Coexistían dos verdades en el mismo archivo.

4. **`WORKFLOW.md:331-355`** ("Comparación Manual vs Script") recomendaba "empezar manual" — un flujo que ya no es válido desde la branch protection.

5. **`README.md`** tenía 76 líneas de TODO list embebida (mezcla de items tildados desde hace tiempo, ideas de backlog, y bugs), no hacía referencia a `WORKFLOW.md` para deploys, y listaba comandos `npm` incompletos.

6. **En ningún doc se explicitaba la disciplina expand-and-contract**, que es la base para que un rollback de código no dependa nunca de "des-migrar" la DB.

## Decisiones

### Decisiones de negocio

- **Priorizar honestidad sobre completitud.** Preferimos que la doc diga "no tenemos rollback de DB de un botón, y por eso usamos disciplina X" antes que mantener el bullet aspiracional de "rollback fácil". Documentación aspiracional erosiona la confianza cuando falla el primer incidente.

- **Documentar el flujo de rollback pensando en la peor situación posible** (app caída, tomando decisiones bajo presión). La sección debe ser leíble bajo estrés, con escenarios identificables rápido y pasos concretos.

- **Borrar la TODO list del README en vez de migrarla a Issues.** Muchos items estaban desactualizados o ya cumplidos. La decisión explícita del owner fue empezar de cero cuando encaremos multitenant/mercado, en vez de arrastrar backlog viejo.

### Decisiones técnicas

- **Reescritura de "Rollback de Emergencia" con 3 escenarios explícitos:**
  - A: solo código → Vercel Instant Rollback (~30s).
  - B: código + migración aditiva → Vercel Instant Rollback + dejar schema como está (~30s).
  - C: código + migración destructiva → PITR o backup de Supabase (minutos, downtime real).
  - Sección "Qué NO hacer nunca" con `--force`, `reset --hard`, y SQL de reversa improvisado bajo presión.

- **Nueva sección "Disciplina de Migrations (Expand-and-Contract)"** con:
  - Lista explícita de migrations seguras (aditivas) vs peligrosas (destructivas).
  - Patrón expand → switch → contract ejemplificado con un rename de columna.
  - Checklist para PRs con migrations que debe responderse antes de mergear.
  - Regla: si alguna respuesta del checklist es "no sé", no mergear.

- **Reemplazo de la sección "Deploy a Production"** por un puntero al script de release + protección de main + disciplina de migrations. Se elimina la contradicción interna del doc.

- **Eliminación de "Comparación Manual vs Script".** El flujo manual ya no es una opción tras la branch protection.

- **README.md:**
  - Sección "Deploy y Base de Datos" con punteros a `docs/workflow.md` y `CLAUDE.md`.
  - Comandos `npm` sincronizados con `CLAUDE.md` (incluye `db:*`, `dev`, `format`).
  - TODO list eliminada.

- **Mover `WORKFLOW.md` de la raíz a `docs/workflow.md`.** Consistencia con el resto de docs técnicos (`docs/architecture/decisions/`), menos ruido en la raíz. El movimiento se hace con `git mv` para preservar historia. Se actualizan todas las referencias vivas (link en `README.md`, comentario en bloque de comandos, `echo_warn` en `scripts/supabase-setup.sh`). Las referencias en ADRs históricos previos se mantienen intactas porque describen el estado del repo al momento de esa decisión.

### Alternativas descartadas

- **Reescribir todo `WORKFLOW.md` de cero.** Descartado — el 60% del contenido (setup de Session Pooler, workflow de migraciones dev, checklist pre-production, versionado semántico) sigue siendo correcto y útil. Reescribir todo hubiera introducido riesgo de perder detalles operativos ya validados.
- **Migrar la TODO list a GitHub Issues.** Descartado por decisión explícita del owner — muchos items ya no aplican, prefiere empezar de cero cuando encaremos multitenant.
- **Implementar Fase 1 (PITR + health check) en el mismo PR.** Descartado para separar cambios: Fase 0 es puro texto, revisar es rápido. Fase 1 toca infra y merece su propio ADR.

## Consideraciones de seguridad

- **Autenticación / Autorización:** no cambia. Este ADR es documental.
- **Exposición de datos:** ninguna. No se agregan connection strings, credenciales, ni URLs internas nuevas. Los ejemplos de rollback usan el dashboard de Vercel/Supabase por UI, no comandos con secretos.
- **Validación de input:** no aplica.
- **Dependencias:** no se agregan.
- **Infraestructura:** no se modifica ninguna configuración de infra. La reescritura del rollback documenta el uso de Vercel Instant Rollback y Supabase PITR — ambas ya son features disponibles hoy en las cuentas del proyecto, no se activan ni desactivan en este cambio.

**Nota:** La sección de rollback ahora menciona PITR como el mecanismo para el escenario C. Fase 1 (ADR aparte) verificará/activará PITR y documentará el RPO/RTO real. Hasta entonces, el escenario C depende del backup diario de Supabase, con la consecuente ventana de pérdida de datos posible. Esto está declarado explícitamente en el paso 3 del escenario C.

## Plan

### Pasos

1. Auditar los docs existentes (`WORKFLOW.md`, `README.md`, `CLAUDE.md`, ADRs previos, `.env.example`) para identificar contradicciones, obsolescencia y falta de información sobre rollback.
2. Crear rama de trabajo `chore/sanear-workflow-docs` desde `develop`.
3. Editar `WORKFLOW.md`:
   - Reemplazar sección "Deploy a Production" por puntero al flujo real.
   - Eliminar bullet "Rollback fácil" en "Beneficios del Setup" y reemplazar por warning honesto sobre falta de down migrations.
   - Eliminar sección "Comparación Manual vs Script".
   - Reescribir "Rollback de Emergencia" con los 3 escenarios y sección de qué no hacer.
   - Agregar nueva sección "Disciplina de Migrations (Expand-and-Contract)".
4. Editar `README.md`:
   - Eliminar TODO list embebida (76 líneas).
   - Agregar sección "Deploy y Base de Datos" con punteros a `docs/workflow.md` y `CLAUDE.md`.
   - Sincronizar comandos `npm` con `CLAUDE.md`.
5. Crear este ADR.
6. Mover `WORKFLOW.md` a `docs/workflow.md` con `git mv` (preserva historia). Actualizar link en `README.md`, comentario en bloque de comandos, `echo_warn` en `scripts/supabase-setup.sh`, y menciones en este mismo ADR.
7. `npm run type-check` y `npm run lint` para verificar que nada rompa (esperado: no rompe nada, solo cambian docs).
8. Reportar al usuario con checklist de revisión antes de commit/push/PR.
