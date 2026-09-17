# Scaffold de la v2 rediseñada y sistema de feature flags por usuario

**Fecha:** 2026-08-17
**Autor:** ema_villanueva@hotmail.com
**Rama:** feat/v2-scaffold

## Descripción

Arranca el rediseño completo de Actitud BO (v2) con layout desktop + mobile responsive. La v2 debe convivir con la v1 durante todo el desarrollo — la v1 no puede dejar de estar disponible en producción.

Este ADR cubre la **Fase 0** del [plan de trabajo v2](../../v2/PLAN.md): montar la infra que habilita el rollout gradual de v2 sin tocar la UI todavía. Concretamente:

1. Sistema de feature flags por usuario (tabla `user_feature_flags` + helpers), reutilizable a futuro para cualquier feature beta.
2. Scaffold de las rutas v2 bajo `/[lang]/[tenant]/v2/*`, con guard que redirige a `/home` si el user no tiene el flag `v2_access`.
3. Placeholder de home v2 para verificar el gate end-to-end.

El diseño real (design system, componentes, home v2) se aborda en fases posteriores. Esta fase deja la infra lista sin ensuciar ni la v1 ni el look-and-feel actual.

## Decisiones

### Decisiones de negocio

- **Coexistencia paralela v1/v2 en el mismo repo, bajo `/[lang]/[tenant]/v2/*`.** Hereda toda la infra actual (middleware, i18n, tenant, theming, auth) sin duplicación. Descartado subdominio (`v2.actitud-bo`) por infra extra y descartado repo separado por duplicar auth/DB/config.
- **Rollout gateado por permiso de usuario, no por env var.** Un flag `v2_access` en DB por user permite habilitar QA/dev/beta users granularmente, sin re-deploy. El día que v2 sea el default se invierte la lógica (flag `v1_legacy` para retener) o se deprecan las rutas v1.
- **Habilitación inicial vía SQL directo, sin UI de admin.** No hay pantalla para toggle-ar el flag todavía. Se documenta cómo hacerlo por SQL (aparte, no se commitea el script porque el flujo cambiará cuando aparezca la UI). Justificación: agregar UI ahora sería feature no requerido; en Fase 0 alcanza con habilitar al owner y 1-2 testers.

### Decisiones técnicas

- **Guard en `layout.tsx` de `/v2/`, no en middleware global.** El layout es Server Component, se ejecuta una vez por navegación (no por asset). Chequear el flag en middleware haría un query extra por cada request de `_next/*` y assets. Además el guard local vive junto a la ruta protegida, no oculto en middleware.
- **Tabla `user_feature_flags` con FK a `profile(id)` (no `auth.users.id`).** Sigue el patrón existente de `user_roles` para consistencia. Permite JOIN directo desde el resto del schema.
- **Función SECURITY DEFINER `public.has_feature_flag(auth_uid, flag_name)`.** Espeja el patrón de `is_admin()` — reutilizable desde policies RLS futuras (ej. tablas v2-only). En Fase 0 sólo la consume el helper server-side, pero la infra queda lista.
- **Dominio `src/feature-flags/` con sólo lo que se consume ahora.** `api/server.ts` (`hasFeatureFlag`, `getCurrentUserFeatureFlags`), `consts.ts` (enum de flags), `types.ts`. Sin `api/client.ts`, sin hook y sin `setUserFlag(admin)` hasta que haya un consumer real (evita abstracciones especulativas — regla de proyecto en CLAUDE.md).
- **Helpers server-side cacheados con `React.cache()`.** Mismo patrón que `getCurrentUserRoles()` en [src/auth/api/server.ts](../../../src/auth/api/server.ts) — dedup per-request para no re-fetchar en múltiples server components de la misma página.
- **Placeholder de `/v2/home` sin UI real.** Renderiza un texto simple que confirma que estás autenticado + tenés el flag. Sirve para verificar el gate en preview antes de que exista design system v2.

## Consideraciones de seguridad

- **Autenticación / Autorización:** el guard de `/v2/*` chequea auth (heredado del middleware que ya redirige a login si no hay sesión) + flag `v2_access` en DB. Un user autenticado sin flag es redirigido a `/home`. No se filtra por qué se redirige (no message específico) — comportamiento equivalente al de rutas admin-only actuales.
- **Exposición de datos:** RLS en `user_feature_flags` — un user puede SELECT sólo sus propios flags (`user_id = profile.id where profile.auth_id = auth.uid()`). INSERT/UPDATE/DELETE limitados a admin. La función `has_feature_flag()` es SECURITY DEFINER porque debe leer flags de cualquier user aunque RLS bloquee al caller (mismo patrón que `is_admin()`).
- **Validación de input:** los nombres de flag se guardan como `text`. La constante `FEATURE_FLAGS.V2_ACCESS = 'v2_access'` en TypeScript es la fuente autoritativa; consultar por strings no listados retorna false. No hay input de usuario final que llegue a este código en Fase 0.
- **Dependencias:** no se agregan dependencias.
- **Infraestructura:** no cambia surface de red. La ruta `/v2/*` existe pero está gateada.

## Lecciones aprendidas

- (A completar durante/después de implementación.)

## Plan

Los pasos concretos que se implementan en esta rama:

### Pasos

1. **Migración** `supabase/migrations/{ts}_user_feature_flags.sql`:
   - Tabla `user_feature_flags(user_id uuid FK profile(id), flag_name text, enabled bool default true, updated_at timestamptz, PK(user_id, flag_name))`.
   - Índice por `user_id`.
   - RLS enabled con policies: SELECT propio, ALL admin.
   - Función `public.has_feature_flag(auth_uid uuid, flag_name text) RETURNS boolean` SECURITY DEFINER.
   - Idempotente con `IF NOT EXISTS` / `CREATE OR REPLACE`.

2. **Dominio `src/feature-flags/`**:
   - `consts.ts`: `FEATURE_FLAGS = { V2_ACCESS: 'v2_access' } as const` + tipo derivado.
   - `types.ts`: interfaces mínimas (`FeatureFlagName`, `UserFeatureFlagRow`).
   - `api/server.ts`: `hasFeatureFlag(name)` y `getCurrentUserFeatureFlags()`, ambos cacheados con `React.cache()`.

3. **Rutas v2**:
   - `src/app/[lang]/[tenant]/v2/layout.tsx` — Server Component con guard `hasFeatureFlag('v2_access')`. Si false, `redirect(HOME)`.
   - `src/app/[lang]/[tenant]/v2/home/page.tsx` — placeholder mínimo con "V2 Home" + confirmación de auth.

4. **Verificar en dev**:
   - `npm run db:push-dev` para aplicar la migración.
   - Habilitar manualmente el flag para el user de dev (SQL directo, se documenta en el reporte final del PR).
   - `npm run type-check` + `npm run lint` — sin errores nuevos.
   - `npm run dev` + probar en browser: user sin flag → redirect; user con flag → ve placeholder.
