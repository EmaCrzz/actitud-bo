# Navegación v2 real: sidebar alineado al Figma + rutas stub

**Fecha:** 2026-09-15
**Autor:** emanuel@getlenk.com
**Rama:** `feat/v2-navegacion-sidebar`

## Descripción

Fase 4 del [plan de rediseño v2](../../v2/PLAN.md). Hasta ahora el sidebar v2 era
decorativo: sólo "Inicio" tenía `href` y el resto de los items no navegaban a ningún lado.
Además su taxonomía no coincidía con el diseño — tenía **"Caja"** y **"Reportes"**, dos
secciones que **no existen en el Figma**, donde los ítems son **"Gastos"** y **"Balance"**.

Esta fase deja el esqueleto navegable: los 8 ítems del menú y los 4 sub-ítems de
Configuraciones apuntan a rutas reales, cada una con una pantalla placeholder. No entrega
funcionalidad de negocio; entrega el andamiaje del que dependen las fases 6 a 14.

Se hizo ahora, antes que cualquier sección, por dos razones: es lo que permite ver las
pantallas en contexto mientras se resuelven las dudas de diseño sobre la marcha, y evita
que cada fase futura invente su propia ruta y su propio patrón de active state.

## Decisiones

### Decisiones de negocio

- **La taxonomía del sidebar sigue al Figma, no al código previo.** "Caja" → **Gastos**,
  "Reportes" → **Balance**. No es un rename cosmético: "Caja" sugiere arqueo/movimientos de
  efectivo y "Reportes" sugiere reportería genérica; el diseño en cambio define una sección
  de egresos (que ya tiene modelo de datos: tabla `expenses`) y una de balance
  ingresos-vs-egresos. Las keys de i18n se renombraron en consecuencia
  (`cashRegister` → `expenses`, `reports` → `balance`) en `es.json` y `en.json`.

- **El orden también sigue al Figma:** Inicio, Clientes, **Asistencias**, **Membresías**,
  Ventas, Gastos, Balance, Configuraciones. Antes Membresías iba tercero y Asistencias
  quinto. Asistencias es el flujo más usado del negocio, así que subirlo es coherente.

- **Se crean las 4 sub-rutas de Configuraciones, incluida Usuarios**, aunque
  **Usuarios no está diseñado en ningún viewport** (ni desktop ni mobile). Se prefiere que
  el ítem del menú navegue a un placeholder honesto antes que a nada: un ítem muerto es
  peor UX que uno que dice "en construcción".

### Decisiones técnicas

- **Rutas centralizadas en [src/consts/routes.ts](../../../src/consts/routes.ts)** bajo un
  bloque `V2_*` + un objeto `ROUTES_V2`. Alternativa considerada: un `routes-v2.ts` aparte
  para no mezclar. Descartada: son 12 constantes, el archivo actual tiene 23, y partirlo
  obliga a recordar en cuál buscar. Un solo lugar canónico es más fácil de mantener que dos
  correctos. Los paths van sin prefijo `[lang]/[tenant]`, igual que las rutas v1: el rewrite
  de `next.config.ts` los agrega.

- **`UnderConstruction` es un componente compartido, no un placeholder copiado 10 veces.**
  Vive en [src/components/v2/UnderConstruction.tsx](../../../src/components/v2/UnderConstruction.tsx)
  y recibe sólo `titleKey`. Cada page es de 5 líneas. Está marcado en el código como
  **TEMPORAL**, con la condición explícita de borrado: cuando la última sección tenga su
  pantalla real.

- **El active state pasa a resolverse con un helper `isRouteActive(pathname, href)`** que
  contempla sub-rutas: `/v2/customers/123` mantiene "Clientes" marcado. Sigue comparando por
  sufijo porque `usePathname()` puede devolver el path ya prefijado con `/{lang}/{tenant}`
  según cómo resuelva el rewrite, y compara incluyendo las barras (`${href}/`) para que
  `/v2/settings/memberships` no marque además a `/v2/memberships`.

  > **Corrección al plan.** El plan v2 afirmaba que el `pathname?.endsWith(href)` anterior
  > "va a dar falsos positivos con rutas anidadas". **Es falso**, y se verificó:
  > `'/v2/settings/memberships'.endsWith('/v2/memberships')` es `false`, porque el sufijo
  > real es `ings/memberships`. El defecto verdadero era el opuesto — un falso **negativo**:
  > ninguna sub-ruta mantenía su ítem padre activo. El fix es el mismo; la justificación
  > escrita en el plan estaba mal y se corrigió ahí también.

- **Los sub-ítems de Configuraciones navegan y marcan su estado activo en los dos modos del
  sidebar.** En expandido, el acordeón **arranca abierto** si el pathname cae dentro del
  grupo — entrar a Configuraciones → Negocio y ver el menú cerrado sería desorientador. En
  colapsado, los `<button>` del popover pasaron a ser `<Link>` (antes no navegaban) y el
  popover se cierra al elegir.

- **`SidebarMenuSubButton` se usa con `asChild`** para envolver el `Link` en vez de anidar
  un `<a>` dentro de un `<a>`.

## Consideraciones de seguridad

- **Autenticación / Autorización:** sin cambios en la lógica, pero **aumenta la superficie
  gateada**: hay 10 rutas nuevas bajo `/v2/*`. Todas heredan el guard del
  [layout de v2](../../../src/app/%5Blang%5D/%5Btenant%5D/v2/layout.tsx), que verifica el
  feature flag `v2_access` y redirige a `/home` si falta. Al ser un layout de App Router,
  cubre todas las pages anidadas sin que cada una tenga que repetir el chequeo. Verificado
  en el checklist de pruebas.
- **Exposición de datos:** ninguna. Las 10 pages nuevas no consultan la base: renderizan
  copy estático traducido. No hay queries, RPCs ni payloads nuevos.
- **Validación de input:** no aplica. Ninguna page nueva lee `params`, `searchParams` ni
  input de usuario. El helper `isRouteActive` sólo compara strings contra constantes del
  propio código, no contra input.
- **Dependencias:** ninguna nueva. Los íconos salen de `lucide-react`, ya en uso.
- **Infraestructura:** sin cambios. No se toca el rewrite, el middleware ni su matcher.

## Lecciones aprendidas

- **Una afirmación escrita en un plan se vuelve verdad por repetición.** El plan decía que
  el `endsWith` daba falsos positivos; sonaba plausible y lo escribí yo mismo. Al ir a
  arreglarlo resultó que el bug era el contrario. Es la segunda vez en dos fases que un
  documento de este repo fija un claim no verificado como hecho — la anterior fue la
  validación de `lang`/`tenant` en middleware, corregida en el ADR
  [20260908111054](./20260908111054_centralizar-resolucion-de-lang-tenant-en-i18n.md).
  Conviene verificar los claims del plan al ejecutarlos, no darlos por buenos.

- **El refactor de i18n previo se pagó solo acá.** Las 10 pages nuevas se escriben en 5
  líneas sin `params`, sin casts y sin threading. Con el patrón anterior habrían sumado 10
  call sites más a migrar. Haberlo hecho primero fue la decisión correcta.

## Pendiente de verificación visual

La cuota del MCP de Figma (seat View) se agotó antes de poder abrir los nodos mobile de
esta fase. Queda sin confirmar contra el diseño:

- **El drawer mobile.** El árbol de nodos indica **260px** de ancho sobre overlay
  (`2174:24784`, `2201:58513`); el `SheetContent` actual no fue ajustado a ese valor. **No se
  tocó**, en aplicación de la regla del plan de no implementar a ciegas lo que no se vio.
- **Los íconos de Gastos y Balance.** Se eligieron `Receipt` y `Wallet` por criterio propio.
  Los labels y el orden **sí** están verificados (nodo `2060:11534`, inspeccionado en la
  sesión del 2026-09-10); los íconos no.

Ambos puntos quedan anotados en la sección de Fase 4 del plan v2.

## Plan

### Pasos

1. Crear la rama desde `develop`.
2. Agregar el bloque `V2_*` y `ROUTES_V2` a `src/consts/routes.ts`.
3. Renombrar y reordenar las keys de `v2.sidebar.menu` en `es.json` y `en.json`; agregar
   `v2.underConstruction.{title,description}`.
4. Reescribir `menuItems` en `AppSidebar` con orden del Figma, `href` en todos los ítems e
   íconos; agregar el helper `isRouteActive`.
5. Hacer navegables los sub-ítems de Configuraciones en los dos modos, con active state y
   acordeón abierto por defecto cuando corresponda.
6. Crear `UnderConstruction` y las 10 pages stub.
7. `npm run type-check` y `npm run lint` — sin errores ni warnings nuevos.
8. Actualizar el plan v2 (estado de la fase, corrección del claim del `endsWith`,
   pendientes de verificación visual) y escribir este ADR.

### Checklist de pruebas manuales (para el PR)

Todo verificable en el preview, sin SQL ni migraciones. No se toca la base.

- **Golden path:** con `v2_access`, clickear los 8 ítems del sidebar y los 4 sub-ítems de
  Configuraciones. Las 12 rutas responden y el ítem correspondiente queda marcado.
- El sidebar muestra **Gastos** y **Balance** (no "Caja" ni "Reportes"), en el orden
  Inicio · Clientes · Asistencias · Membresías · Ventas · Gastos · Balance · Configuraciones.
- **Modo colapsado** (`Cmd/Ctrl+B`): los ítems siguen navegando; el popover de
  Configuraciones abre, sus opciones navegan y el popover se cierra al elegir.
- **Acordeón:** entrar directo a `/v2/settings/promotions` por URL → Configuraciones aparece
  abierto y "Promociones" marcado.
- **Mobile** (375px): el drawer abre, los ítems navegan y el drawer se cierra al navegar.
- **Regresión v1:** `/home`, `/customer`, `/expenses`, `/stats`, `/assistances` intactas —
  esta fase no toca v1, pero `routes.ts` es compartido.
- **Guard:** un user **sin** `v2_access` que entre a `/v2/balance` (o cualquiera de las 10
  nuevas) debe ser redirigido a `/home`.
