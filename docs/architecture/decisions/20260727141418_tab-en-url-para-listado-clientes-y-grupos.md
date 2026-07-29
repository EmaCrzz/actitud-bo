# Tab en URL para listado de clientes y grupos + back contextual con `?from=`

**Fecha:** 2026-07-27
**Autor:** emanuel@getlenk.com
**Rama:** feat/discounts-family-groups

## Descripción

El listado `/customer` tiene dos tabs (Individuales / Grupos). El tab estaba
en state local, así que:

- Un share del link a `/customer` no preservaba en qué tab estaba parado el usuario.
- Al crear un grupo familiar (flow `/customer/groups/new`), la app redirigía al
  detalle del grupo — lo esperado por el usuario era caer en el listado con el
  tab Grupos activo para ver el nuevo grupo en contexto.
- Además el listado usa React Query (`['groups', 'list']`) que quedaba stale
  tras la creación: el grupo aparecía solo con un refresh manual.

Adicionalmente, desde `/customer/[id]` se puede navegar al detalle del grupo
familiar del cliente. El back de esa página siempre volvía a `/customer?tab=groups`,
lo cual es incorrecto cuando el usuario venía desde el perfil de un cliente:
esperaba volver al perfil, no al listado de grupos.

## Decisiones

### Decisiones de negocio

- Post-creación de un grupo: navegar a `/customer?tab=groups` (no al detalle).
  Alinea con el patrón de "volver al listado con feedback" que ya usan otras
  pantallas y evita el paso extra "back → tab groups" que hoy hacía el usuario.
- Individuales como tab default cuando la URL viene sin `?tab=`: es el uso más
  frecuente y mantiene URLs cortas para links compartidos al listado.
- Back contextual desde `/customer/groups/[id]`: si el usuario llega desde el
  perfil de un cliente, el back debe llevarlo de vuelta al perfil. Si llega
  desde el listado (o por link directo/refresh), va al listado con tab Grupos.
- El botón "Eliminar grupo" **no respeta** el `?from`: siempre vuelve al listado
  de grupos. Racional: el grupo ya no existe, volver al perfil que lo mostraba
  puede confundir con datos stale.

### Decisiones técnicas

- Tabs controlados por URL: `value` derivado de `useSearchParams`,
  `onValueChange` hace `router.replace('/customer' | '/customer?tab=groups', { scroll: false })`.
  - `replace` en vez de `push` para no ensuciar el history con cada toggle.
    Trade-off aceptado: el "back" del browser desde `?tab=groups` no vuelve a
    individuals, vuelve a la página previa.
  - Individuals se representa omitiendo el param (URL "pelada"), en vez de
    `?tab=individuals` explícito. Consistente con "default implícito".
- Constante `CUSTOMER_LIST_GROUPS = '/customer?tab=groups'` en
  [src/consts/routes.ts](../../../src/consts/routes.ts) para no scatterar el
  string por back-links y redirects. Alternativa descartada: helper `customerListUrl(tab)` —
  overkill para dos valores.
- Cache stale post-creación: `queryClient.invalidateQueries({ queryKey: ['groups', 'list'] })`
  antes del `router.push`. Alternativa descartada: `router.refresh()` — invalidaría
  también el server component (`initialCustomers`), innecesario porque los
  grupos se fetchean client-side.
- Back-links de las páginas de grupos (`/customer/groups/new` y `/customer/groups/[id]`)
  ahora apuntan a `CUSTOMER_LIST_GROUPS`, así el usuario vuelve al tab correcto
  sin extra clicks. Los back-links de páginas de cliente individual siguen
  apuntando a `/customer` (default = individuals).
- Back contextual vía `?from=<path>` en `/customer/groups/[id]`:
  - `GroupBadge` recibe `fromPath` y lo agrega al href con `encodeURIComponent`.
  - La page lee `searchParams.from` (Server Component, `Promise<{ from?: string }>`)
    y lo resuelve con `resolveBackHref()`, una whitelist estricta: sólo paths
    que empiezan con `/customer` y no con `//`. Todo lo demás cae al default.
    Esto bloquea open redirects (`?from=https://evil.com`) y protocol-relative
    (`?from=//evil.com`).
  - Alternativa descartada: `router.back()` del browser. Contra: se rompe con
    refresh o entrada directa (no hay history), y no distingue "vine del perfil"
    vs "vine del listado" — el `?from` es explícito y refresh-safe.
  - Alternativa descartada: `document.referrer`. Contra: no confiable en soft
    navs de Next.js y expone info cross-origin en algunos browsers.

## Consideraciones de seguridad

- **Open redirect vía `?from=`**: el param `from` se usa como `href` de un `Link`.
  Sin validación, `?from=https://evil.com` renderizaría un back que saca al
  usuario del sitio (o peor, con `javascript:` según Next.js Link). Mitigación:
  `resolveBackHref()` en [src/app/\[lang\]/\[tenant\]/customer/groups/\[id\]/page.tsx](../../../src/app/[lang]/[tenant]/customer/groups/[id]/page.tsx)
  aplica una whitelist estricta (solo `/customer*`, no protocol-relative).
- No hay otras implicaciones: el resto es UX de query params y estado de React Query.

## Plan

### Pasos

1. Agregar `CUSTOMER_TAB_INDIVIDUALS`, `CUSTOMER_TAB_GROUPS` y `CUSTOMER_LIST_GROUPS`
   en [src/consts/routes.ts](../../../src/consts/routes.ts).
2. Convertir `Tabs` a controlado en [src/customer/list-with-tabs.tsx](../../../src/customer/list-with-tabs.tsx):
   derivar `value` de `?tab=` y sync con URL via `router.replace`.
3. En [src/group/components/create-form.tsx](../../../src/group/components/create-form.tsx),
   invalidar `['groups', 'list']` y redirigir a `CUSTOMER_LIST_GROUPS`.
4. Migrar back-links y redirect de delete a la constante:
   - [src/app/\[lang\]/\[tenant\]/customer/groups/new/page.tsx](../../../src/app/[lang]/[tenant]/customer/groups/new/page.tsx)
   - [src/app/\[lang\]/\[tenant\]/customer/groups/\[id\]/page.tsx](../../../src/app/[lang]/[tenant]/customer/groups/[id]/page.tsx)
   - [src/group/components/detail.tsx](../../../src/group/components/detail.tsx)
5. Back contextual: `GroupBadge` acepta `fromPath` y lo agrega como `?from=` al
   link del grupo; `/customer/[id]/page.tsx` pasa `` `${CUSTOMER}/${id}` ``.
6. En `/customer/groups/[id]/page.tsx`, aceptar `searchParams`, validar `from`
   con whitelist y usarlo como href del back (fallback a `CUSTOMER_LIST_GROUPS`).
