# Fix del buscador sticky que deja ver la lista por detrás

**Fecha:** 2026-07-08
**Autor:** federubents@gmail.com
**Rama:** fix/sticky-search-overlap

## Descripción

En la pantalla de Ingresos, al scrollear, la primera card de la lista se veía
asomando **por encima** del buscador fijo (`sticky`). El mismo comportamiento se
reproducía en el listado de Clientes. El buscador quedaba fijo correctamente,
pero había una franja transparente por encima de su fondo opaco a través de la
cual el contenido scrolleaba y quedaba visible.

El diagnóstico encontró que **es un único bug con dos disparadores del mismo
mecanismo**: un elemento `position: sticky; top: 0` con `bg-background` opaco,
pero con espacio transparente por encima de su caja de fondo. Con `top: 0`, ese
espacio queda entre el borde superior del scrollport y el fondo del buscador, y
el contenido que scrollea se ve por ahí.

Los dos disparadores encontrados:

- **Ingresos** ([`src/customer/stats/actives.tsx`](../../../src/customer/stats/actives.tsx)):
  la franja venía del `pt-6` del `<section>` contenedor de scroll
  ([`incomes/page.tsx`](../../../src/app/[lang]/[tenant]/incomes/page.tsx)). El
  padding-top del contenedor de scroll es parte del scrollport y el contenido
  scrollea a través de él, por encima del punto donde el sticky se ancla.
- **Clientes** ([`src/customer/list.tsx`](../../../src/customer/list.tsx)): la
  franja venía del `mt-2 sm:mt-6` del propio buscador. Con `sticky top-0`, el
  margin-top queda por encima de la caja con `bg-background`, dejando ver el
  contenido por ese margen.

La pantalla de Gastos ([`src/expenses/components/list.tsx`](../../../src/expenses/components/list.tsx))
era la única sin el bug, y ya usaba el patrón correcto:
`sticky top-0 z-20 flex pt-2 bg-background pb-0.5` — el espaciado va como
**padding adentro** del sticky (lo tapa el `bg-background`), sin margin externo
ni padding en el contenedor de scroll, y con `z-index`.

## Decisiones

### Decisiones de negocio

- El buscador debe tapar completamente la lista al scrollear (comportamiento
  esperado de un buscador fijo). No debe verse ninguna card por detrás ni por
  encima de él.
- El estado inicial (sin scrollear) debe quedar **visualmente idéntico** al
  actual: mismo espaciado, mismos colores. El fix es puramente correctivo del
  comportamiento al scrollear.

### Decisiones técnicas

- **Se unifica el patrón del buscador sticky con el de la pantalla de Gastos**,
  que ya era correcto: el espaciado superior va como `padding` **adentro** del
  elemento sticky (tapado por `bg-background`), nunca como `margin` externo ni
  como `padding-top` del contenedor de scroll. Se agrega `z-index` para blindar
  contra que las cards (con transforms/estados interactivos) pinten por encima.
- **Ingresos** ([`incomes/page.tsx`](../../../src/app/[lang]/[tenant]/incomes/page.tsx)):
  se saca `pt-6` del `<section>` (contenedor de scroll) y se pasa al `<h3>`
  "Pagos", que es contenido que scrollea y no forma parte del padding del
  scrollport. Mismo espaciado inicial, sin franja.
- **Clientes** ([`list.tsx`](../../../src/customer/list.tsx), listado y loading):
  `mt-2 sm:mt-6` → `pt-2 sm:pt-6` y `mt-6` → `pt-6`, más `z-10`. El gap ya era
  del mismo color (`#260210`), así que ahora es idéntico pero opaco y dentro del
  sticky.
- **Componentes compartidos** ([`actives.tsx`](../../../src/customer/stats/actives.tsx),
  [`pendings.tsx`](../../../src/customer/stats/pendings.tsx),
  [`loading.tsx`](../../../src/customer/stats/loading.tsx)): se agrega `z-10` al
  wrapper sticky. `CustomerActives`/`CustomerPendings` se comparten entre
  Ingresos y Estadísticas › Clientes; en Estadísticas el `<section>` no tiene
  `pt`, por eso ahí no se notaba, pero se blinda igual por consistencia.
- Se usa `z-10` (en vez del `z-20` de Gastos) por ser suficiente para quedar por
  encima de las cards en flujo normal; no hay otra capa posicionada compitiendo
  en estas pantallas. Se prioriza no introducir un valor de z-index más alto del
  necesario.
- **Alternativa descartada:** extender el fondo del sticky hacia arriba con
  `-mt-6 pt-6` para tapar la franja del `pt-6` del contenedor en Ingresos. Se
  descartó por acoplarse al valor exacto del padding del contenedor y ser más
  frágil que mover el espaciado a contenido que scrollea.

## Consideraciones de seguridad

No se identifican implicaciones de seguridad. El cambio es puramente de
presentación: son ediciones a clases de Tailwind (`className`) que ajustan el
espaciado y el z-index de los buscadores sticky. No modifica lógica, hooks,
estado, queries, autenticación, autorización, exposición de datos, validación de
input ni dependencias.

## Plan

### Pasos

1. Sacar `pt-6` del `<section>` de Ingresos y pasarlo al `<h3>` "Pagos".
2. En el listado de Clientes (y su loading): convertir el `margin-top` del
   buscador en `padding-top` interno y agregar `z-10`.
3. Agregar `z-10` al wrapper sticky de `actives.tsx`, `pendings.tsx` y
   `loading.tsx` (stats).
4. Verificar `type-check` (pasa limpio) y `lint` (0 errores; 4 warnings
   preexistentes de `console` en archivos ajenos al cambio).
5. Validar en localhost: scrollear cada pantalla y confirmar que el buscador
   tapa la lista, sin cambios en el estado inicial.
