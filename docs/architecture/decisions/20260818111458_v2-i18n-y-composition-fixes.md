# Fixes de i18n, composition patterns y hidratación en la superficie v2

**Fecha:** 2026-08-18
**Autor:** ema_villanueva@hotmail.com
**Rama:** fix/v2-i18n-and-composition

## Descripción

Auditoría y corrección de los archivos v2 mergeados en fases 0, 1 y 1.5. Tres clases de problemas surgieron al revisarlos contra las skills `/vercel-react-best-practices` y `/vercel-composition-patterns` y contra la regla de proyecto de que **todo string visible debe pasar por i18n**:

1. **Sin i18n.** Ni el layout, ni el sidebar, ni el header, ni el placeholder de home usaban `useTranslations()` / `api.fetch()`. Los strings estaban hardcodeados en español (aria-labels, brand, menu items, greeting, fecha, roles). Regresión respecto al patrón establecido en v1 (todo el dashboard de `/incomes` usa `useTranslations()`).
2. **Hydration mismatch potencial en `Header`.** `format(new Date(), ...)` con `date-fns/locale/es` corría dentro de un `'use client'`. Server y client pueden diferir en timezone o cruzar medianoche entre SSR y hydration, produciendo mismatch silencioso. Además arrastraba `date-fns` al bundle client del layout v2.
3. **Mega-render con ramas inline en `AppSidebar`.** La función `menuItems.map(...)` combinaba 4 variantes inline (`item.children ? (collapsed ? Popover : Acordeón) : Leaf`). Difícil de leer, cambios locales en una variante forzaban tocar la función madre completa. Antipatrón `patterns-explicit-variants` de las composition patterns de Vercel.

Este ADR cubre los fixes aplicados en un solo pase para dejar la superficie v2 en estado sano antes de arrancar Fase 2 (Home real).

También aprovecha para actualizar `docs/v2/PLAN.md` con el estado real de merges (fases 0/1/1.5 mergeadas en `develop`), agregar el registro de PR #45 al log de cambios, y aclarar las divergencias entre plan original e implementación (guard en layout en vez de middleware, componentes flat en vez de folders, `api/client.ts` y `hooks/` diferidos hasta consumer real).

## Decisiones

### Decisiones de negocio

- **i18n obligatorio desde el día 1 en toda la superficie v2.** Ningún string visible puede estar hardcodeado. Establece la barra para todas las próximas pantallas v2. El otro dev que valida en preview trabaja en español por default, pero la infra de idioma ya está montada — no cerrar la puerta.
- **Namespace `v2.*` en el diccionario base.** Todos los strings específicos de la v2 viven bajo la key raíz `v2.*` (`v2.header.*`, `v2.sidebar.*`, `v2.home.*`, `v2.roles.*`). Facilita greppear, borrar el bloque completo si se deprecara v2, y evita colisiones con la nomenclatura de v1. Se **reusan** keys existentes cuando el término coincide 1:1 (ejemplos válidos futuros: `navigation.home`, `membership.titlePlural`, `buttons.logout`, `common.close`), pero para lo que es específico de la nueva UI se agregan keys nuevas para no forzar semántica ajena.
- **Placeholder de home también se traduce.** Aunque el archivo se rescribe en Fase 2, dejarlo hardcodeado sienta un mal precedente ("es dummy, no traduzco"). Consistencia > ahorro de 3 keys.

### Decisiones técnicas

- **Fetch de translations en Server Components vía `api.fetch(lang, tenant)` directo.** El helper documentado en `examples.md` (`getServerT()`, `getServerTranslations()`) no existe — solo hay `api.fetch()` con `React.cache()` wrappeando el load del diccionario. Llamar `api.fetch()` múltiples veces dentro del mismo request no duplica trabajo. Descartado crear un wrapper `getServerT()` ad-hoc: agregar abstracción sin consumer múltiple viola la regla de proyecto de no inflar. Se agenda actualizar `examples.md` cuando exista un uso mayor.
- **Formatear "hoy" en el server, pasar como string al Header client.** Se agregó `formatTodayForHeader(lang)` en `v2/layout.tsx` que usa `Intl.DateTimeFormat` con `timeZone: APP_TIMEZONE` y el locale de la ruta. Resultado ya capitalizado se pasa al Header como prop `todayLabel`. Ventajas:
  - Elimina hydration mismatch: server y client renderizan la misma string.
  - Saca `date-fns` y `date-fns/locale/es` del bundle client (era el único consumer directo en `src/`).
  - Respeta la timezone AR del negocio (regla crítica del proyecto documentada en CLAUDE.md).
  Descartado usar `date-fns-tz`: agregar dep para lo que `Intl.DateTimeFormat` ya resuelve nativo.
- **Sub-componentes explícitos para las variantes del sidebar menu.** Refactor de `AppSidebar.tsx` en:
  - `SidebarBrand` (header con brand + env badge + toggle).
  - `SidebarUserFooter` (avatar + logout).
  - `MenuList` (loop sobre `menuItems`, delega al componente correcto).
  - `MenuLeafItem` (item sin hijos, con o sin `href`).
  - `MenuGroupItemExpanded` (item con hijos, modo acordeón).
  - `MenuGroupItemCollapsed` (item con hijos, modo popover) — renombrado de `CollapsedGroupPopover`.
  - `EnvBadge` (badge de ambiente con tooltip traducido).
  Aplica `patterns-explicit-variants`: cada variante es un componente propio con su firma clara, cambios locales quedan contenidos. Descartado usar boolean props tipo `<MenuItem collapsed hasChildren />` con branching interno: sería exactamente el antipatrón `architecture-avoid-boolean-props`.
- **`ENV_BADGE` hoisted a constante módulo-level.** `process.env.NEXT_PUBLIC_VERCEL_ENV` es constante en build; no hay razón para llamarlo en cada render (`advanced-init-once` / `rendering-hoist-jsx`). Además el chequeo `production → null` queda visible arriba, no escondido en una función interna.
- **`Promise.all([getCurrentUser(), i18n.fetch(...)])` en el layout.** `getCurrentUser` y el fetch de translations son independientes — paralelizarlos ahorra un round-trip. `getProfile(authUser.id)` sigue secuencial porque depende de `authUser.id`.
- **Tipo `TranslationKey` en los `MenuItem`.** El array `menuItems` guarda `labelKey: TranslationKey` en vez de strings ya traducidos, así el `t()` corre en el componente que renderiza. Beneficios: type-safety sobre las keys (el diccionario `es.json` es la fuente de verdad tipada), y el mismo array puede reusarse en tests / storybook / server render sin que la traducción se congele.
- **`brandName` y `brandTagline` van en el diccionario base, no en el override tenant.** Actitud es el único tenant que usa v2 hoy; el default en `es.json` (`"Actitud Gym"`, `"Sistema de gestión"`) aplica directo. Cuando Core / Wellrise adopten v2, agregarán override en `dictionaries/tenant/{tenant}.json`. Mismo patrón que `auth.welcomeMessage` de v1.

## Consideraciones de seguridad

- **Autenticación / Autorización:** sin cambios. El guard de `/v2/*` sigue siendo `hasFeatureFlag('v2_access')` en el layout.
- **Exposición de datos:** los strings traducidos no exponen datos nuevos. El `EnvBadge` mostraba y sigue mostrando `DEV` / `PREVIEW` según el env de Vercel, no hay filtrado nuevo.
- **Validación de input:** los params `lang` y `tenant` se casteanan a `Language` y `TenantsType`. El middleware ya valida ambos antes de llegar al layout (rutas inválidas → redirect). `t()` con key inexistente devuelve la key (fallback documentado en `api.ts`).
- **Dependencias:** no se agregan. Se remueve el uso de `date-fns` del bundle client de v2 (sigue como transitive de `react-day-picker`).
- **Infraestructura:** sin cambios.

## Lecciones aprendidas

- **`examples.md` de i18n está desactualizado.** Menciona `getServerT()`, `getServerTranslations()`, `useT()`, `hooks.ts`, `server.ts` — ninguno existe. La API real es: `useTranslations()` desde `@/lib/i18n/context` (client) e `import i18n from '@/lib/i18n/api'` → `i18n.fetch(lang, tenant)` (server). Al escribir código nuevo, verificar la API en el file, no en la doc.
- **El `TranslationKey` type se infiere del `es.json`.** Si agregás keys nuevas, TypeScript las reconoce inmediatamente sin regenerar nada. Muy cómodo. La única fricción es que las 4 keys de `settingsSubmenu` produjeron una key TS bastante larga (`v2.sidebar.menu.settingsSubmenu.business`) — aceptable dado que se genera 1 sola vez y es autocompletado.
- **`Intl.DateTimeFormat('es-AR', { timeZone })` matchea exactamente el output de `date-fns format(new Date(), "EEEE, dd 'de' MMMM", { locale: es })`** con capitalización manual del primer char. No se ganó ni se perdió información visible.
- **La regla `patterns-explicit-variants` mejora legibilidad medible.** El `menuItems.map(...)` original era 60 líneas con 4 branchings anidados; ahora es un delegate de 20 líneas + 3 componentes independientes de ~25 líneas cada uno. Cada uno se lee sin cargar los otros.

## Plan

### Pasos

1. **Housekeeping de `docs/v2/PLAN.md`**:
   - Tabla de progreso: fases 0 y 1 → ✅ completa, agregar fila 1.5 (PR #45).
   - Sección "Cambios registrados": entrada de PR #45 con aprendizajes del sidebar colapsable + fixes responsive.
   - Fase 0: nota post-implementación aclarando que el guard vive en el layout, no en middleware.
   - Fase 1: nota aclarando que `Sidebar/Header` quedaron flat + regla de co-location.
   - "Archivos críticos": sacar `middleware.ts`, `api/client.ts`, `hooks/`.
   - Entrada nueva en changelog con este ADR.

2. **Diccionarios i18n**:
   - Agregar bloque `v2.*` en `src/lib/i18n/dictionaries/es.json` con keys para: `roles.{admin, userFallback}`, `header.{greeting, todayIs, openMenu}`, `sidebar.{brandName, brandTagline, menuTitle, closeMenu, expandSidebar, collapseSidebar, logout, envTooltip, envBadge.{dev, preview}, menu.{home, customers, memberships, sales, attendance, cashRegister, reports, settings, settingsSubmenu.{business, memberships, promotions, users}}}`, `home.{placeholder.{title, description}, metrics.{todayAttendances, noAttendancesRegistered, activeClientsMonth, expiredMembershipsCount}}`.
   - Mismas keys en `en.json` (evitar que `TranslationKey` reporte inconsistencias — aunque el sistema no chequea explícitamente los overrides EN).
   - **No** tocar `dictionaries/tenant/actitud.json`: los defaults ya reflejan el brand Actitud.

3. **`src/app/[lang]/[tenant]/v2/layout.tsx`**:
   - Aceptar `params: Promise<{ lang; tenant }>` en la firma.
   - `Promise.all([getCurrentUser(), i18n.fetch(lang, tenant)])` para paralelizar.
   - Reemplazar hardcodes: `'Administrador'` → `t('v2.roles.admin')`, `'Usuario'` fallback → `t('v2.roles.userFallback')`.
   - Nueva función `formatTodayForHeader(lang)` con `Intl.DateTimeFormat` + `APP_TIMEZONE`.
   - Pasar `todayLabel` como prop nueva a `AppShell`.

4. **`src/components/v2/Header.tsx`**:
   - Remover `import { format }` y `import { es }` (date-fns).
   - Aceptar prop `todayLabel: string`.
   - Wrappear con `useTranslations()`. `¡Hola, {name}!` → `t('v2.header.greeting', { name })`. `Hoy es {date}` → `t('v2.header.todayIs', { date: todayLabel })`. `'Abrir menú'` aria → `t('v2.header.openMenu')`.

5. **`src/components/v2/AppShell.tsx`**:
   - Aceptar `todayLabel: string` en `AppShellProps`, propagarlo a `Header`.
   - `useTranslations()` en `AppShellInner`. `<SheetTitle>Menú</SheetTitle>` → `<SheetTitle>{t('v2.sidebar.menuTitle')}</SheetTitle>`.

6. **`src/components/v2/AppSidebar.tsx`**:
   - Hoist `getEnvBadgeLabel()` como constante `ENV_BADGE` a nivel de módulo.
   - `menuItems` guarda `labelKey: TranslationKey`, no strings.
   - Extraer sub-componentes: `SidebarBrand`, `EnvBadge`, `MenuList`, `MenuLeafItem`, `MenuGroupItemExpanded`, `MenuGroupItemCollapsed`, `SidebarUserFooter`. El componente exportado `AppSidebar` queda como composición delgada.
   - Cada sub-componente que muestra texto usa `useTranslations()`. aria-labels y tooltips traducidos.

7. **`src/app/[lang]/[tenant]/v2/home/page.tsx`**:
   - Convertir a `async` server component con `params`.
   - `const { t } = await i18n.fetch(lang, tenant)`.
   - Traducir todos los strings (títulos, subtítulos, descripción). El count del subtitle "10 clientes con membresía vencida" se sigue hardcodeando por ahora (es dummy) — data real en Fase 2 reemplazará todo el file.

8. **ADR**: este documento, commiteado en el mismo commit que los cambios.

9. **Verificación**:
   - `npm run type-check` — sin errores nuevos.
   - `npm run lint` — sin errores nuevos.
   - Reportar checklist manual al user para probar en localhost: `/v2/home` desktop + mobile, verificar todos los textos, colapsar sidebar, popover de Configuraciones, drawer mobile.
