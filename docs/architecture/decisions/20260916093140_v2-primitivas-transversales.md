# Primitivas transversales v2

**Fecha:** 2026-09-16
**Autor:** emanuel@getlenk.com
**Rama:** `feat/v2-primitivas`

## Descripción

Fase 5 del [plan de rediseño v2](../../v2/PLAN.md). Construye los componentes que las fases 6
a 14 van a instanciar decenas de veces: tabla de datos, panel lateral, confirmación, barra de
filtros, badge de estado, stepper, estado vacío y encabezado de sección.

No entrega ninguna pantalla de usuario. Se hizo como fase propia porque hacerlos mal o tarde
implica reescribir nueve secciones: el `Data Table` solo aparece en 11 de los 17 flows del
Figma.

Se hizo después de que Ema pasara capturas (2026-09-15) que resolvieron las tres dudas de
diseño que la bloqueaban — cómo degrada la tabla en mobile, cómo se presenta el modal de
formulario, y si la paleta rosa era marca o placeholder.

## Decisiones

### Decisiones de negocio

- **Todo se construye en escala de grises.** El rosa/magenta del Figma **es** la marca de
  Actitud, pero Ema indicó que no es necesario aplicarlo todavía. La paleta entra después en
  una pasada dedicada sobre las CSS vars de `[data-v2]` — exactamente para lo que sirve el
  theming scoped de la fase 1. Evita mezclar decisiones de color con decisiones de API de
  componentes, que es lo que esta fase define.

- **Sin paginación por ahora.** Ningún wireframe muestra paginador. Con el volumen actual
  (cientos de clientes) scroll + filtros alcanza, y agregarla después es aditivo: no cambia la
  firma de `DataTable`.

### Decisiones técnicas

- **`DataTable` tiene dos renders, y el tipo lo obliga.** El hallazgo central de las capturas:
  el Figma **no achica la tabla** en mobile, la **reemplaza** por una lista de filas (avatar
  con iniciales + nombre + línea secundaria + badge). No hay headers de columna ni scroll
  horizontal. Por eso `mobileRow` es un prop **requerido**, no opcional con fallback: un
  default plausible habría dejado que cada sección se olvidara del mobile y se enterara en
  review. Se acompaña de `DataTableMobileRow`, que implementa la forma estándar del Figma
  para no recrearla en cada sección.

- **Tabla propia sobre `<table>` semántico, no TanStack Table.** El uso real es render +
  filtros server-side; 14kB de librería para eso es sobre-ingeniería, y su capa de estilos
  pelea con el theming scoped. Tampoco se instaló el `table` de shadcn: son wrappers finos y
  `DataTable` es el único consumer.

- **`FormModal` y `DetailModal` colapsaron en un solo `SidePanel`.** El plan los preveía como
  dos componentes. La geometría del Figma los desmiente: `Modal / Membership Form` y
  `Customer Detail Modal` son **ambos** `x=800, 480×832` en el frame desktop de 1280
  (anclados al borde derecho, altura completa) y `390×844` full-screen en mobile. Son el
  mismo contenedor con contenido distinto. Dos wrappers que sólo se diferenciaran en el
  nombre habrían sido abstracción sin sustancia.

  `SidePanel` expone `pinned` (contenido fijo entre header y body) porque el Figma lo usa
  para dos cosas distintas: el `Stepper` en los formularios multi-step y la ficha del cliente
  anclada en el flow de renovación.

- **`FilterBar` se compone con children, no se parametriza.** La cantidad de dropdowns varía
  por sección (Clientes 2, Ventas y Gastos 3, Balance 2 sin search). Un `filters: Filter[]` o
  flags booleanos habría sido la vía a la proliferación que la regla de composición del
  proyecto busca evitar. Cada sección arma la suya.

- **`AssistanceModal` se refactorizó sobre `SidePanel`** en vez de dejar dos implementaciones
  del mismo panel. Para eso `SidePanel` recibe un `avatar` opcional: ese modal usa la
  identidad del cliente como título, mientras el resto de los flows usa el nombre de la
  acción. **Cambio visual menor:** el ancho pasa de `520px` a `480px`, que es el valor del
  Figma.

- **Estados de tabla definidos por nosotros, con la forma de los dos empty states que el
  Figma sí diseñó** (`Gastos/Vacio` y Ventas en $0): ícono en círculo, título, descripción y
  acción opcional. `DataTable` recibe `empty` y `error` como slots — no arma copy por su
  cuenta — y renderiza skeletons de fila para `isLoading`. Consecuencia: **la primitiva no
  agrega ni una key de i18n**, porque no decide copy.

- **`data-v2='true'` propagado en `SidePanel`, `ConfirmDialog` y `FilterDropdown`.** Los tres
  montan por portal fuera del wrapper `[data-v2]` del layout; sin eso heredan la paleta del
  tenant v1. Es la convención de la fase 1.5 y hay que repetirla en cada primitive nuevo que
  use portal.

## Consideraciones de seguridad

No se identifican implicaciones de seguridad.

- **Autenticación / Autorización:** sin cambios. Las primitivas son presentación pura; no
  consultan la base ni conocen al usuario. La ruta nueva `/v2/sandbox` hereda el guard de
  `v2_access` del layout de `/v2/*`, igual que las 10 stubs de la fase 4.
- **Exposición de datos:** ninguna. `PrimitivesSandbox` usa cuatro filas hardcodeadas con
  nombres inventados — no toca la base ni muestra datos reales de clientes.
- **Validación de input:** no aplica. El único input es el search de `FilterBar`, cuyo valor
  es state local del consumer; la primitiva no lo interpola en queries ni en HTML.
- **Dependencias:** ninguna nueva — se descartó TanStack Table explícitamente. Los íconos
  salen de `lucide-react`, ya en uso.
- **Infraestructura:** sin cambios.

## Excepción consciente a una convención del proyecto

**`PrimitivesSandbox.tsx` no usa i18n**, contra la regla "todo string visible pasa por
`useTranslations()`" establecida en la fase 1.6.

Motivo: es un harness de desarrollo, no UI de producto. Sus strings ("Sandbox de primitivas",
"achicá la ventana a menos de 768px", "data / loading / empty") son etiquetas para el dev que
revisa los componentes. Traducirlas implicaría sumar ~20 keys al diccionario que habría que
borrar cuando la página se elimine.

Queda registrado acá para que sea una decisión visible y no un olvido. Si se prefiere
consistencia estricta, convertirlo son 20 minutos.

## Dos bugs encontrados en la revisión visual

Ema revisó el sandbox y encontró dos problemas que no se ven leyendo el código. Ambos son
**convenciones nuevas**, no fixes puntuales: aplican a todo lo que se construya de acá en
adelante.

### 1. Todo portal con `data-v2` necesita un `!p-*` explícito

`globals.css` aplica el padding externo del viewport con
`[data-v2='true'] { padding: 2rem 3rem }`. Como los portales de Radix se montan fuera del
wrapper del layout, hay que propagarles `data-v2='true'` para que hereden la paleta — y al
hacerlo **también heredan esos 48px horizontales**, que se suman al padding propio del
componente.

Un `p-0` común **no alcanza**: pierde por especificidad contra la regla global. Hay que usar
`!p-0` (o el valor que corresponda). El drawer del `AppShell` ya lo hacía desde la fase 1.5,
pero no estaba escrito en ningún lado y lo repetí mal en tres primitivas nuevas.

Afecta a `SidePanel`, `ConfirmDialog`, `FilterDropdown` y a cualquier `DropdownMenuContent`,
`PopoverContent` o `SelectContent` que lleve el atributo.

### 2. `min-h-0` en la columna del main del `AppShell`

Con una página larga, el contenido desbordaba el `h-dvh` del wrapper `[data-v2]` y el sobrante
se dibujaba sobre el fondo del tenant v1 (maroon). Causa: `<main className='flex-1'>` es un
flex item, y un flex item tiene `min-height: auto`, así que no puede encogerse por debajo de
su contenido — crece y se sale del contenedor en vez de scrollear adentro.

Se agregó `min-h-0` a la columna del main y al `<main>`. Es el **gemelo vertical** del
`flex-1 w-full min-w-0` que el ADR de la fase 1.5 ya había documentado para el ancho.

Lo encontró el sandbox por ser la primera página v2 con contenido más alto que el viewport.
Sin este fix, la fase 6 (listado de clientes) se habría topado con el mismo bug apenas
hubiera 20 filas.

### 3. El círculo del paso activo del `Stepper` era invisible

Usaba `bg-primary-500`, que **no existe**. El `@theme` de `globals.css` mapea la escala sin
guion antes del número — `primary300`, `primary400`, `primary` (= el 500), `primary600` — así
que esa clase no genera utilidad y el fondo quedaba transparente. Como el texto sí resolvía
(`text-primary-contrast`, casi blanco), el resultado era un círculo invisible: blanco sobre
blanco.

Lo delator es que **ni el type-check ni el lint detectan una clase de Tailwind inexistente**.
Sólo se ve mirando la pantalla, y sólo si sabés que ahí debería haber algo. Se corrigió a
`bg-primary` y se agregó la convención a la lista del plan v2.

### 4. Los botones: tres estilos distintos conviviendo

Ema marcó que los botones del sandbox estaban mal y pidió replicar los del home v2. Al ir a
buscarlos apareció que **el home tampoco era consistente consigo mismo**:

| Dónde | Estilo |
|---|---|
| `AttendanceSearchCard` — "Registrar asistencia" | contained con `bg-sidebar-accent` (gris medio `#737373`) |
| `AssistanceModal` — "Confirmar" | contained con `bg-foreground` (casi negro `#0a0a0a`) |
| `QuickActionsSection` — "Nuevo cliente" | outlined con `px-4 py-2` |
| `AssistanceModal` — "Ver perfil" | outlined con `px-4 py-2.5` |

Más el sandbox, que usaba el `Button` de shadcn — que lleva la geometría de v1
(`rounded-[4px]`, `font-headline`) y apunta a los tokens del tenant viejo.

**Decisión: un átomo `Button` propio de v2**, en `src/components/v2/ui/`. Se eligió
`bg-foreground` como contained canónico porque en escala de grises el negro es el mayor
énfasis disponible, y un gris medio se lee como secundario o deshabilitado. Variantes:
`contained`, `outlined`, `ghost`, `destructive`; tamaños `sm`, `md`, `icon`; y `asChild` para
envolver un `<Link>` sin anidar `<a>` dentro de `<button>`.

**Cambio visual en una pantalla ya mergeada:** "Registrar asistencia" pasa de gris medio a
negro. Es el precio de unificar, y va en la dirección correcta — ese botón es la acción
primaria del home.

Los `<button>` que **no** se migraron son afordances de ícono (la X de limpiar el search, el
hamburger, el toggle del sidebar) y filas clickeables (`DataTableMobileRow`, los resultados de
búsqueda). No son botones visuales; meterlos al átomo sería forzar la abstracción.

**Segunda pasada — el `ConfirmDialog` seguía mal.** Crear el átomo no alcanzó: los wrappers
`AlertDialogCancel` y `AlertDialogAction` de shadcn **hardcodean `buttonVariants()` del botón
de v1** en su propio `className`, así que no bastaba con pasarles el Button por `asChild` — el
wrapper igual mergeaba los estilos viejos encima.

Se resolvió usando `AlertDialogPrimitive.Cancel` / `.Action` de Radix directamente con
`asChild`. Se conserva el comportamiento (foco inicial en Cancel, cierre automático al
confirmar) y el estilo lo pone el Button de v2, sin capa intermedia que lo pise.

**Regla que queda:** cuando un wrapper de shadcn aplica estilos propios, en v2 hay que ir al
primitive de Radix. Revisar esto en cada primitive nuevo que envuelva un componente de
`components/ui/`.

### 5. El mismo problema, ahora con `Input` y `Select`

Tras unificar los botones, Ema marcó que el search y la acción de la `FilterBar` no alineaban
en una fila. Misma causa: el `Input` de `@/components/ui` está customizado para v1 con
`text-base` (16px) y `py-4`, lo que da **~56px de alto** contra los 40px del botón. El
`SelectTrigger` arrastra lo mismo (`py-3 sm:py-4`, `rounded-[4px]`, `text-base`).

En el Figma el search y la acción miden **los dos 36px** — `Input Search` 622×36 junto a
`Buttons` 177×36 en el home, `Search Bar` 306×36 junto a `New Client Button` 40×36 en
Clientes. Se creó el átomo `v2/ui/Input.tsx` con `h-9` como base.

Además la fila de la `FilterBar` pasó a `items-stretch`, para que la acción tome la altura del
search por layout en vez de depender de que cada consumer acuerde el `size` correcto. Que
midan lo mismo es una invariante de esa barra, no una preferencia del consumer.

**La deuda del `Select` se pagó en la misma fase.** Se había asumido neutralizar el
`SelectTrigger` con overrides `!` y diferir el átomo hasta tener un segundo consumer. Duró una
revisión: Ema marcó que el item resaltado del desplegable era ilegible, y ahí apareció que el
problema no se arregla con overrides de altura.

`SelectItem` de v1 hardcodea `hover:text-white` y `data-[highlighted]:text-white` sobre
`bg-inputhover`, y `SelectContent` tiene **`text-white` en su clase base**. En v1 eso funciona
porque el fondo es maroon oscuro; en v2, que es claro, el item resaltado quedaba **blanco sobre
gris claro** — invisible.

Se creó `v2/ui/Select.tsx` sobre los primitives de Radix (`Trigger`, `Content`, `Item`,
`Value`, `Group`), mismo criterio que en `ConfirmDialog`: cuando el wrapper de shadcn pelea con
la paleta de v2, se baja al primitive. El `FilterDropdown` quedó sin un solo `!` override.

Contraste que vale anotar: el `DropdownMenuItem` de v1 **sí** está bien — usa
`focus:bg-accent focus:text-accent-foreground`, que son tokens y resuelven correctamente en v2.
El problema no es "los primitives de v1", es **los que hardcodean colores en vez de usar
tokens**.

**Patrón que ya es evidente:** cada primitive de `components/ui/` que se usa en v2 arrastra la
geometría y los tokens de v1. Van tres (`Button`, `Input`, `Select`). La regla para lo que
viene: antes de reusar un primitive de v1 en una pantalla v2, verificar su altura y su
`rounded`; si no matchean, el átomo va a `v2/ui/`.

### 6. El radius estaba mal en toda la superficie v2

Tercera pasada sobre lo mismo. Con las alturas ya alineadas, la fila seguía viéndose mal.
La causa era el radius:

`globals.css` define, bajo `[data-v2]`, `--radius: 0.5rem` con el comentario *"Figma
radius-md"*. La utilidad que mapea a ese token es **`rounded-lg`**. Pero en v2 había **16 usos
de `rounded-xl`**, que en Tailwind es un literal de **12px** — ignora el token y queda 50% más
redondo que el diseño. De ahí el aspecto de píldora.

Es exactamente la misma clase de error que `bg-primary-500`: escribir una utilidad de Tailwind
plausible en vez del token del proyecto, sin que ninguna herramienta lo detecte. Ya van dos en
esta fase.

Se corrigieron los 16, lo que incluye componentes del home ya mergeados (`AssistanceModal`,
`DailySummaryCard`, `WeeklyAttendanceCard`, `AppShell`, `AppSidebar`, `Header`).

**Y se hicieron explícitas las alturas del Button** (`h-8` / `h-9` en vez de derivarlas de
`py-*`). Con altura emergente, dos elementos de la misma fila alineaban por casualidad; con
altura explícita, alinean por construcción y se pudo sacar el `items-stretch` de la
`FilterBar`.

### Estructura de carpetas: átomos separados

A sugerencia de Ema se abrió `src/components/v2/ui/` para los átomos, separándolos de los
componentes compuestos:

```
src/components/v2/
├── ui/                    # átomos: sin lógica de dominio, sin composición
│   ├── Button.tsx
│   └── StatusBadge.tsx
├── DataTable.tsx          # compuestos
├── SidePanel.tsx
├── FilterBar.tsx
└── …
```

El criterio: si el componente **compone otros** o tiene estados propios, va en la raíz de
`v2/`; si es una pieza terminal de presentación, va en `ui/`.

## Lecciones aprendidas

- **La geometría del árbol de nodos vale más que los nombres de las capas.** El Figma tiene
  dos componentes con nombres distintos que resultaron ser el mismo contenedor. Leer los
  `x/width/height` del metadata evitó construir dos wrappers redundantes — y el nombre
  `Modal / Membership Form` es directamente engañoso: no tiene nada que ver con membresías,
  es el shell genérico de formulario.

- **Un prop requerido es documentación ejecutable.** Hacer `mobileRow` obligatorio convierte
  un hallazgo de diseño ("en mobile no es una tabla") en algo que el compilador recuerda por
  nosotros en cada sección futura.

- **Una convención que vive sólo en un archivo no es una convención.** El `!p-0` del drawer
  existía desde la fase 1.5, pero como nunca se escribió por qué, lo repetí mal en tres
  primitivas nuevas. Lo mismo con el `min-h-0`: la versión horizontal estaba documentada, la
  vertical no, y volvió a aparecer. Cuando un fix es una regla general, va al ADR.

- **Una fase de componentes necesita su sandbox.** Los tres bugs son invisibles leyendo el
  código y no los habría encontrado el type-check ni el lint. Sin una página donde verlos, se
  descubrían recién en la fase 6, mezclados con lógica de negocio.

- **Una clase de Tailwind inexistente falla en silencio.** No hay red de seguridad automática:
  el type-check no ve strings de className y el lint tampoco. La única defensa es conocer los
  tokens del proyecto — de ahí que la convención de nombres de la escala esté ahora escrita en
  el plan en vez de vivir sólo en `globals.css`.

## Plan

### Pasos

1. Crear la rama desde `develop`.
2. Primitivas de presentación pura: `EmptyState`, `PageHeader`, `StatusBadge`, `Stepper`.
3. `SidePanel` (shell de 480×832 desktop / full-screen mobile) y `ConfirmDialog` (centrado).
4. `DataTable` con doble render + `DataTableMobileRow` + skeletons.
5. `FilterBar` (composable) + `FilterDropdown`.
6. Refactorizar `AssistanceModal` sobre `SidePanel`.
7. Página de sandbox en `/v2/sandbox` para revisión visual.
8. `npm run type-check` y `npm run lint` sin errores ni warnings nuevos.
9. ADR + actualización del plan v2.

### Checklist de pruebas manuales (para el PR)

Todo en `/v2/sandbox`, sin SQL ni migraciones. No se toca la base.

- **`DataTable` desktop:** la tabla muestra headers, filas y el menú de acciones a la derecha.
  El click en el menú **no** dispara el click de la fila.
- **`DataTable` mobile:** achicar a menos de 768px → la tabla desaparece y queda la lista de
  filas con avatar + nombre + "Membresía: N días" + badge. Sin scroll horizontal.
- **Estados:** los botones `data` / `loading` / `empty` cambian entre filas, skeletons y
  estado vacío.
- **Filtros:** escribir en el search filtra; la X lo limpia; el dropdown de membresía filtra;
  ambos combinan.
- **`SidePanel`:** "Abrir SidePanel" → entra desde la derecha, 480px en desktop y full-screen
  en mobile. Scrollea el body, el footer queda fijo. Cierra con la X y con Escape.
- **`ConfirmDialog`:** abre centrado, el botón de confirmar es destructivo (rojo).
- **Paleta:** los portales (panel, dialog, dropdown) deben verse en la paleta clara de v2, **no**
  con el fondo maroon del tenant v1. Es el error que este punto verifica.
- **Regresión de la fase 3:** en `/v2/home`, buscar un cliente y abrir el modal de asistencia.
  Debe verse y funcionar igual que antes — ahora corre sobre `SidePanel` y mide 480px en vez
  de 520px.
- **Regresión v1:** `/home`, `/customer`, `/expenses`, `/stats` intactas.
