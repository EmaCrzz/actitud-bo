# Design system v2 con theming scoped `[data-v2]` y primitives compartidos

**Fecha:** 2026-08-17
**Autor:** ema_villanueva@hotmail.com
**Rama:** feat/v2-design-system

## Descripción

Segunda fase del rediseño v2 (ver [ADR anterior](20260817111834_v2-scaffold-and-feature-flags.md) y `docs/v2/PLAN.md` — local). Deja cargados los tokens y componentes base que van a consumir todas las pantallas v2.

Concretamente:
1. Tokens del design system v2 (Nunito Sans + Geist Mono, escala neutral shadcn-default, accents verde/amarillo/mauve del Figma) aplicados vía scope `[data-v2='true']` en `globals.css`.
2. Cuatro primitives shadcn faltantes instalados (`sidebar`, `sheet`, `scroll-area`, `separator`), compartidos con v1.
3. Componentes base v2 en `src/components/v2/`: `AppShell` (responsive), `Sidebar` (con menu items del diseño), `Header` (greeting + fecha + avatar), `MetricCard` (métrica reusable).

Al final de la fase el placeholder de `/v2/home` renderiza el shell responsive completo con métricas dummy, permitiendo verificar visualmente que los tokens y layout responden como se espera.

## Decisiones

### Decisiones de negocio

- **Tokens shadcn-default como base del design system v2.** El Figma usa una paleta neutral casi 1:1 con shadcn/ui default. Adoptarla evita reinventar tokens y facilita instalar primitives futuros sin modificarlos.
- **Menu items completos desde el día 1, pero solo Inicio navega.** El resto (Clientes, Membresías, Ventas, Asistencias, Caja, Reportes, Configuraciones) se renderizan como items visuales sin `href` para poder mostrar el sidebar del diseño real. Se van conectando en fases siguientes cuando exista la pantalla correspondiente. Justificación: permite ver/validar el shell completo con el look final sin esperar a que estén todas las pantallas.

### Decisiones técnicas

- **Scope-based theming vía `[data-v2='true']` en `globals.css`.** El proyecto ya usa Tailwind v4 con `@theme inline` para mapear utility classes a CSS custom properties (ver [globals.css](../../../src/app/[lang]/[tenant]/globals.css)). En vez de duplicar primitives o crear un theme provider paralelo, agregamos un bloque `[data-v2='true'] { --color-*: <valor Figma> }` que sobreescribe las mismas vars. El wrapper del layout v2 activa el scope; todos los primitives shadcn ya instalados (Button, Card, Input, Dialog, etc.) responden automáticamente con la paleta nueva sin cambios de código. **Descartadas:**
  - Duplicar primitives en `src/components/ui/v2/` — mucha duplicación, mantenimiento doble.
  - Reescribir primitives contra vars shadcn-default `--primary` — rompería la v1 que emite `--color-primary-500`.
- **Padding externo del viewport aplicado en `globals.css` sobre `[data-v2]`.** `padding: 1rem 1.5rem` mobile, `padding: 2rem 3rem` en `≥1024px` (media query directa, más confiable que utilities responsive de Tailwind sobre un attribute selector). Aplicado también `body:has([data-v2='true']) { padding-top: 0 }` para neutralizar el `pt-7` que el root layout agrega para el EnvBanner (que en v2 no se muestra).
- **Fonts globales, no tenant-scoped todavía.** Nunito Sans + Geist Mono se agregan a [src/lib/themes/fonts.ts](../../../src/lib/themes/fonts.ts) como fonts globales (no dentro de `fontMap` por tenant). En el scope `[data-v2]` se mapean a `--font-family-primary` y `--font-family-headline`. Cuando se armen los temas v2 de Core/Wellrise se puede refactorizar a fontMap-per-tenant.
- **AppShell con layout flex custom, NO `variant='inset'` de shadcn Sidebar.** `variant='inset'` (evaluado inicialmente) genera dos cards separadas con margins/padding que no matchean el Figma. Además el shadcn `<Sidebar>` usa `position: fixed` en TODOS los variants excepto `collapsible='none'`, lo que impide que respete un padding del wrapper. **Approach adoptado:**
  - `<SidebarProvider>` solo para context (useSidebar hook + ancho consistente).
  - Desktop: `<aside className='rounded-lg bg-primary-contrast border w-[255px]'>` inline con `<AppSidebar>` como contenido puro.
  - Mobile: `<Sheet>` custom controlado por estado local (`useState` en AppShell), abierto por el hamburger del Header.
  - `<AppSidebar>` es contenido puro (SidebarHeader/Content/Footer/Menu directos), **sin** `<Sidebar>` wrapper de shadcn — funciona igual porque los sub-primitives dependen solo del context de SidebarProvider.
  - Gap entre sidebar y main: `pl-6 lg:pl-12` en el div del main. Ancho del sidebar fijo a `w-[255px]` matcheando el Figma.
- **Sidebar, main y header son cards individuales** con `rounded-lg + border + bg-primary-contrast` (#fafafa) sobre el bg blanco del viewport. Contraste sutil pero coincide con el Figma. Los MetricCards internos también son cards.
- **Active state del menu usa `--color-sidebar-accent`** (no `--color-sidebar-primary`). shadcn `SidebarMenuButton` mapea `data-[active=true]:bg-sidebar-accent`. Set a `#525252` (gris medio Figma) con foreground blanco. Hover comparte la misma variable — aceptable.
- **EnvBanner suprimido en `/v2/*`** (client component chequea `usePathname()`). Reemplazado por un badge inline (`DEV` / `PREVIEW`) al lado del brand en el sidebar. Aplica también `body:has([data-v2]) { padding-top: 0 }` para neutralizar el reservado del banner.
- **Componentes v2 co-located en `src/components/v2/` (no en `src/[domain]/components/v2/`).** El plan original decía co-located por dominio. Para componentes verdaderamente compartidos entre dominios (AppShell, AppSidebar, Header, MetricCard) tiene más sentido `src/components/v2/`. Los componentes específicos de dominio (ej. `src/customer/components/v2/CustomerCard.tsx`) sí van co-located. **Regla:** shared-across-domains → `src/components/v2/`; domain-specific → `src/[domain]/components/v2/`.

## Consideraciones de seguridad

- **Autenticación / Autorización:** sin cambios. El guard de `/v2/*` sigue siendo el `hasFeatureFlag('v2_access')` del ADR anterior.
- **Exposición de datos:** placeholder de home muestra el email del user autenticado. Data dummy en `MetricCard`s (números hardcoded). No hay queries a DB en Fase 1.
- **Validación de input:** no hay input de usuario en esta fase.
- **Dependencias:** se instalan 4 primitives de shadcn/ui (código generado en el repo, no packages nuevos). Nunito Sans + Geist Mono son fonts de Google Fonts, cargadas vía `next/font/google` como el resto.
- **Infraestructura:** sin cambios.

## Lecciones aprendidas

- **shadcn `<Sidebar>` es `position: fixed` en todos los variants menos `collapsible='none'`.** Cualquier padding del wrapper del layout NO afecta al sidebar visible — se pega al viewport. La única forma de tener un sidebar inline (que respete el padding externo) es no usar el `<Sidebar>` wrapper y renderizar los sub-primitives (SidebarHeader/Content/Footer) dentro de un `<aside>` propio. Descubierto tras dos iteraciones fallidas con `variant='inset'` que producía layout con dos cards separadas.
- **`data-active=true` de `SidebarMenuButton` usa `--color-sidebar-accent`, no `--color-sidebar-primary`.** Cambiar `sidebar-primary` no tiene efecto visible en el active state. Perdí una iteración por esto.
- **Bug de rewrites: `pathname === '/v2/home'` puede fallar** dependiendo de si Next.js resuelve el pathname pre o post-rewrite. Usar `pathname?.endsWith(item.href)` es robusto para ambos casos.
- **Padding responsive con `[data-v2='true'] { padding: ... }` + media query directa** es más confiable que `class='p-4 lg:p-8'` sobre un attribute selector — Tailwind a veces no toma bien la combinación.
- **Ancho fijo del sidebar `w-[255px]`** matchea el Figma exactamente. La var `--sidebar-width` de shadcn (`16rem = 256px`) también sirve pero el px-exacto elimina cualquier ambigüedad.

## Plan

### Pasos

1. **Fonts:** agregar Nunito Sans + Geist Mono en `src/lib/themes/fonts.ts` como fonts globales, con variables `--font-nunito` y `--font-geist-mono`. Exportar helper `v2FontVariables` que devuelve las className variables para el wrapper del layout v2.

2. **Globals.css:** agregar bloque `[data-v2='true']` con las CSS vars de Figma. Incluye colores neutrales, accents (green/11, yellow/11, mauve), radius y font-family. Agregar en `@theme inline` las vars faltantes que el diseño v2 usa (`--color-muted-foreground`, `--color-sidebar`, `--color-sidebar-foreground`, etc.).

3. **Instalar primitives shadcn:** `npx shadcn@latest add sidebar sheet scroll-area separator`. Verificar que quedan en `src/components/ui/`.

4. **Componentes base v2:**
   - `src/components/v2/AppShell.tsx` — `<SidebarProvider>` con `<Sidebar>` desktop-only + `<Sheet>` mobile + `<main>` con children. Header sticky top.
   - `src/components/v2/Sidebar/index.tsx` — items del Figma con iconos (usa `<Sidebar>` de shadcn). Solo Inicio con `href='/v2/home'`, resto `<SidebarMenuButton>` sin link.
   - `src/components/v2/Header/index.tsx` — greeting "¡Hola, {name}!" + fecha en español (usa helpers de `date-fns` o similar) + avatar user (server-loaded).
   - `src/components/v2/MetricCard.tsx` — reusable: title, big number, subtitle con color semántico (verde/naranja/muted).

5. **Layout v2:** modificar `src/app/[lang]/[tenant]/v2/layout.tsx` para envolver children en `<div data-v2='true' className={v2FontVariables}>` que activa el scope y carga las fonts.

6. **Home v2:** modificar `src/app/[lang]/[tenant]/v2/home/page.tsx` para usar `<AppShell>` con 2-3 `<MetricCard>` dummy — permite validar shell responsive.

7. **Verificar:** `npm run type-check` + `npm run lint` + `npm run dev` → probar responsive desktop→mobile, verificar tokens en DevTools.
