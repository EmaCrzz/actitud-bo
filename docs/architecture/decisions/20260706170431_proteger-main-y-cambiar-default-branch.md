# Proteger `main` y cambiar default branch a `develop`

**Fecha:** 2026-07-06
**Autor:** emanuel@getlenk.com
**Rama:** chore/proteger-main

## Descripción

El repo tenía `main` como default branch en GitHub. Cada merge a `develop` generaba el banner "Compare & pull request: develop → main", empujando visualmente a un flujo (PR manual `develop → main`) que rompe el proceso de release documentado. El release correcto es vía `./scripts/release.sh`, que bumpea `package.json`, mergea, taggea y pushea de forma atómica — un merge manual saltea el bump de versión y el tag, dejando prod corriendo sin identificador.

Además, `main` no tenía branch protection: cualquiera con acceso podía mergear directo, borrar la rama o force-pushear.

El objetivo del cambio es cortar la posibilidad de que un dev (o el propio owner por error) alcance producción por fuera del script de release.

## Decisiones

### Decisiones de negocio

- **Solo el owner tiene bypass sobre las reglas de `main`.** Para un side project con un solo dev activo, exigir 1 approval con `enforce_admins=true` bloquearía al owner sin necesidad. Se prefirió flexibilidad para hotfix/rollback de emergencia sobre rigidez total.
- **`develop` como default branch** aunque `main` sigue siendo la rama de producción — asumir el costo de que "default" y "producción" ya no coinciden a cambio de eliminar la sugerencia engañosa de GitHub y hacer que clones/PRs nuevos apunten al lugar correcto sin fricción.

### Decisiones técnicas

- **Default branch:** `main` → `develop` vía `PATCH /repos/{owner}/{repo}`.
- **Branch protection en `main`:**
  - `required_pull_request_reviews.required_approving_review_count = 1`
  - `required_pull_request_reviews.require_code_owner_reviews = true`
  - `enforce_admins = false` (bypass para owner)
  - `allow_force_pushes = false`
  - `allow_deletions = false`
  - `required_conversation_resolution = true`
  - `required_status_checks = null` (no hay CI de status checks configurado hoy)
- **CODEOWNERS:** archivo mínimo `* @EmaCrzz` en `.github/CODEOWNERS`. Combinado con `require_code_owner_reviews`, garantiza que cualquier PR a `main` requiera aprobación del owner.
- **Documentación:** nueva sección "Protección de `main`" en `WORKFLOW.md` con las reglas y el mensaje explícito de que el único camino a prod es `release.sh`.

### Alternativas descartadas

- **Ruleset "solo `develop` puede targetear `main`":** overkill para un side project con un solo dev activo. Se puede sumar más adelante si se incorporan colaboradores.
- **GitHub Action que valide bump de `package.json` en PRs a `main`:** overkill hoy. La protección + code owner review ya obligan al owner a intervenir; el hábito de usar `release.sh` cubre el resto.
- **`enforce_admins = true`:** descartado — dejaría al owner sin capacidad de hotfix rápido si la app está caída en prod.

## Consideraciones de seguridad

- **Autenticación / Autorización:** no cambia el modelo de auth de la app. Sí endurece el modelo de acceso al repo — reduce el blast radius de un merge accidental o de una PR maliciosa a producción.
- **Exposición de datos:** ninguna. No se toca código de la app ni configuración de datos.
- **Validación de input:** no aplica.
- **Dependencias:** no se agregan.
- **Infraestructura:** el cambio de default branch es reversible con otro `PATCH` en el mismo endpoint. La branch protection es reversible desde Settings → Branches. Ninguno afecta el deploy de Vercel, que sigue disparándose por push a `main`.

## Plan

### Pasos

1. Cambiar default branch del repo de `main` a `develop` vía `gh api PATCH /repos/EmaCrzz/actitud-bo`.
2. Setear branch protection en `main` vía `gh api PUT /repos/EmaCrzz/actitud-bo/branches/main/protection` con las reglas listadas arriba.
3. Crear rama de trabajo `chore/proteger-main` desde `develop`.
4. Crear `.github/CODEOWNERS` con `* @EmaCrzz`.
5. Agregar sección "Protección de `main`" en `WORKFLOW.md`.
6. Documentar la decisión en este ADR.
7. `npm run type-check` y `npm run lint` para verificar que nada rompa.
8. Reportar al usuario para confirmación antes de commit/push/PR.
