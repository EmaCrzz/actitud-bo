# v2: el scroll del contenido vive en el AppShell

**Fecha:** 2026-09-18
**Autor:** emanuel@getlenk.com
**Rama:** feat/v2-alta-cliente

## Descripción

En la v2 el contenido que no entra en la altura del viewport se dibujaba fuera
del layout, sobre el fondo negro del tenant v1. Reportado en mobile en el home
(`/v2/home`), donde el card "Asistencia semanal" quedaba cortado a mitad de la
lista con el fondo oscuro debajo, pero el defecto era estructural: afectaba a
cualquier ruta v2 con contenido más alto que la pantalla, en cualquier tamaño.

Causa raíz: el wrapper `[data-v2]` es `h-dvh` (necesario para que el sidebar de
desktop sea fijo y el main tenga una altura contra la cual calcular), y la
cadena `SidebarProvider → columna principal → <main>` ya tenía `min-h-0` para
poder encogerse. Pero **`min-h-0` sólo habilita el encogimiento; no recorta ni
scrollea nada**. Ningún nodo de la cadena declaraba `overflow`, así que el
sobrante se pintaba fuera del `h-dvh` en vez de generar scroll. Encima, cada
página usaba `h-full` en su contenedor raíz, de modo que el borde del card se
quedaba a la altura del viewport mientras el contenido lo atravesaba.

El bug ya había aparecido antes (el comentario de `min-h-0` en `AppShell` es de
ese intento anterior). Se arregló el síntoma —que el main pudiera encogerse—
pero no el hecho de que nadie scrolleaba, así que volvió con la primera página
que creció.

## Decisiones

### Decisiones de negocio

- La v2 no cambia de comportamiento visible salvo que ahora el contenido largo
  scrollea en vez de desbordar. Header y sidebar quedan anclados: es lo que
  define el Figma del app shell.
- En mobile, el listado de clientes pasa a scrollear completo (filtros y
  paginador incluidos) en vez de encerrar la lista en una ventana de scroll
  propia. En un viewport de teléfono esa ventana quedaba en ~200px y mostraba
  2 o 3 cards; el paginador anclado no compensa esa pérdida de lectura.
  En desktop se mantiene el diseño del Figma: tabla con scroll interno, filtros
  y paginador fijos.

### Decisiones técnicas

- **Un solo contenedor de scroll, y vive en el shell.** `<main>` en
  [AppShell.tsx](../../../src/components/v2/AppShell.tsx) pasa a
  `flex-1 min-h-0 overflow-y-auto overscroll-contain`. Es el invariante que hace
  que el bug no pueda volver: cualquier página futura, por alta que sea, scrollea
  ahí sin tener que acordarse de nada.
- **Las páginas usan `min-h-full`, no `h-full`, en su contenedor raíz.**
  `h-full` fija la altura al viewport y deja el contenido saliendo por debajo del
  borde del card. `min-h-full` da el piso (borde hasta abajo cuando sobra
  espacio) y permite crecer cuando falta. Aplicado en `v2/home/page.tsx`,
  `UnderConstruction` y `PrimitivesSandbox`.
  Nota: el `pt-4` del `<main>` no rompe la cuenta — un porcentaje de altura se
  resuelve contra el *content box* del contenedor, así que `min-h-full` + padding
  da exactamente el alto del main, sin desbordar.
- **`overscroll-contain`** para que al llegar a los extremos el scroll no encadene
  al body (pull-to-refresh accidental en mobile).
- **`shrink-0` en el `<Header>`**, para que no sea él quien ceda altura cuando el
  contenido crece. Antes dependía de `min-height: auto`, que basta pero es
  implícito.
- **Listado de clientes: contenido responsive, no dos layouts.** En vez de
  duplicar el componente, las tres clases que definen el modo de scroll quedaron
  prefijadas con `md:` en
  [CustomersSection.tsx](../../../src/customer/components/v2/CustomersSection.tsx)
  y [v2/customers/page.tsx](<../../../src/app/[lang]/[tenant]/v2/customers/page.tsx>):
  `min-h-full md:h-full` en el card, `md:min-h-0` en la columna y
  `flex-1 md:min-h-0 md:overflow-y-auto` en el wrapper de la tabla. Debajo de
  `md` el `min-height: auto` por default impide que los items se encojan por
  debajo de su contenido, que es justamente lo que evita el desborde.
  Se eligió `md` porque es el breakpoint en el que el sidebar deja de ser Sheet
  y el shell pasa a modo desktop.
- **Los `SidePanel` no se tocaron.** Ya tenían el patrón correcto
  (`flex-1 overflow-y-auto` en el body, header/pinned/footer fijos), igual que el
  `SidebarContent` de shadcn.

### Alternativas descartadas

- **`min-h-dvh` en mobile y `h-dvh` en desktop**, dejando scrollear al body en
  teléfonos. Da scroll nativo (la barra de URL se colapsa, se siente mejor), pero
  obliga a que cada página tenga dos modos de altura y deja el header fuera de la
  pantalla al scrollear, que no es lo que muestra el Figma. Más superficie de
  bug por poco rédito.
- **`overflow-hidden` en el wrapper `[data-v2]`.** Tapa el fondo negro pero
  recorta el contenido: el bug visual desaparece y el funcional queda peor.

## Consideraciones de seguridad

No se identifican implicaciones de seguridad. El cambio es exclusivamente de
CSS/layout: no toca autenticación, autorización, queries, RLS, input de usuario
ni dependencias.

## Lecciones aprendidas

- `min-h-0` y `overflow` resuelven cosas distintas y se necesitan las dos. El
  primero permite que un flex item se encoja; el segundo decide qué pasa con lo
  que no entra. Arreglar sólo el primero deja el bug latente hasta la próxima
  página larga — que es exactamente lo que pasó acá.
- El síntoma "aparece fondo negro" es un indicador de desborde del shell v2, no
  un problema de color: el negro es el fondo del tenant v1 asomando por detrás.
- `h-full` en el contenedor raíz de una página es casi siempre un bug esperando:
  sirve sólo cuando esa página maneja su propio scroll interno (como el listado
  en desktop). El default correcto es `min-h-full`.

## Plan

### Pasos

1. Mapear la cadena de alturas desde `[data-v2]` hasta los contenedores raíz de
   cada página v2 y confirmar que ningún nodo declaraba `overflow`.
2. Poner el scroll en `<main>` (`overflow-y-auto overscroll-contain`) y fijar el
   header con `shrink-0`.
3. Migrar los contenedores raíz de `h-full` a `min-h-full` en home,
   `UnderConstruction` y el sandbox de primitivas.
4. Hacer responsive el modo de scroll del listado de clientes: crecer en mobile,
   scroll interno en desktop.
5. Verificar que los `SidePanel` y el sidebar ya resolvían su propio overflow y
   no necesitan cambios.
6. `npm run type-check` y `npm run lint` sin errores ni warnings nuevos.
