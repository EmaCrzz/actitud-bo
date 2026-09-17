# SuccessTick — animación de check con burst radial

**Fecha:** 2026-08-19
**Autor:** emanuel@getlenk.com
**Rama:** feat/v2-attendance-modal

## Descripción

El check que aparece en el slot recién confirmado del modal de asistencia usaba
`animate-in zoom-in-50` sobre el `CheckCircle2` de lucide: un pop genérico, sin
identidad. Se reemplaza por una réplica del "Success Tick Animation" de
LottieFiles — anillo que aparece de golpe, tilde que se dibuja por trim, burst de
16 rayos radiales — implementada como componente reutilizable.

El requisito explícito fue que el comportamiento se pueda replicar en otros
lugares (toasts de pago, confirmaciones de alta, etc.), así que el componente vive
en `src/components/` y no dentro del dominio `home`.

## Decisiones

### Decisiones de negocio

- El cambio es puramente visual: no toca el registro de asistencia, la DB ni
  ninguna fecha. No hay superficie de regresión funcional.
- En el modal la animación se usa **sin salida** (`exit={false}`): el check del
  slot es un indicador de estado persistente, no un feedback efímero. Si dejáramos
  correr la salida del timeline original, el check de la fila se borraría solo a
  los 2.25s y quedaría una fila "asistida" sin check.

### Decisiones técnicas

- **CSS keyframes, sin Lottie ni librerías de animación.** El SVG es inline y
  todo el timeline vive en `@keyframes`. Cero bytes de dependencia nueva y el
  ícono escala igual a 24px que a 240px porque toda la geometría está en unidades
  del viewBox (240×240).

- **Las keyframes se generan en JS desde una constante `TIMELINE`.** Los tiempos
  del spec son absolutos (0.12s, 0.50s, 2.25s…) pero el ciclo tiene tres largos
  posibles, así que los porcentajes de cada stop dependen de la duración. En vez
  de mantener tres bloques de CSS a mano, `buildVariantCss()` los deriva de los
  mismos tiempos. Cambiar el timeline es tocar un solo objeto.

- **Tres variantes de ciclo** en lugar de un único `emptyTail`:
  - `full` (4.00s) — salida + frame vacío, para loops.
  - `short` (2.65s) — salida sin frame vacío (`emptyTail={false}`).
  - `persist` (0.85s) — se corta después del burst y el estado final queda fijo
    (`exit={false}`). Es una adición al spec original, necesaria para el caso del
    modal (ver decisión de negocio).

- **Un solo `<style>` en el head vía React 19.** `<style href="success-tick"
  precedence="default">` deduplica por `href`, así que N instancias montadas al
  mismo tiempo no repiten el stylesheet.

- **El estado de reposo del CSS es el estado final de la animación** (anillo +
  tilde, sin rayos). Así `playing={false}` y `prefers-reduced-motion: reduce`
  caen en el mismo render sin lógica extra en JS.

- **Anillo: nunca hay draw-on.** `stroke-dashoffset: 0` desde el frame 0. La
  salida retrae el extremo final con `dasharray: C C` y `dashoffset: 0 → C`.

- **Cero rotaciones en todo el SVG.** El anillo no es un `<circle>` sino un path
  de dos semiarcos que arranca a la 1 en punto, y cada rayo se dibuja ya en su
  ángulo con las coordenadas calculadas. Es más código que un `rotate()`, pero
  elimina toda dependencia del `transform-origin` — ver lecciones aprendidas: la
  versión con rotaciones se rompía dejando el anillo fuera del cuadro.

- **Salida asimétrica.** El anillo se despinta por dashoffset; el tilde **no** —
  sale por `opacity`. Igualar ambos es el error típico al copiar esta animación.

- **Rayos: radio y opacidad en elementos distintos.** El `<g>` externo lleva la
  opacidad (ease-in, se sostiene y cae al final); el `<line>` interno lleva el
  `translate()` hacia afuera con ease-out marcado, con el delta por rayo pasado en
  custom properties. Están separados porque necesitan curvas distintas y una
  keyframe no puede darle easings diferentes a dos propiedades del mismo elemento.

- **Rayos apagados por default bajo 48px** (`rays ?? size >= RAY_MIN_SIZE`): a
  ese tamaño el stroke queda sub-pixel y se lee como ruido. En el modal el check
  mide 36px, así que sale sin burst — solo anillo + tilde.

- **`onComplete` por `setTimeout`, no por `animationend`.** Hay cuatro
  animaciones corriendo en paralelo y bajo `prefers-reduced-motion` no dispara
  ninguna; un timer sobre la duración conocida del ciclo es determinístico en
  ambos casos.

- **La lista entera usa la geometría del SuccessTick, no solo el slot nuevo.**
  El check de lucide y el del SuccessTick son íconos estructuralmente distintos y
  puestos uno al lado del otro se nota:

  | | lucide `CheckCircle2` | SuccessTick |
  |---|---|---|
  | diámetro exterior / viewBox | 91.7% | 50.0% |
  | grosor del anillo / diámetro | 10.0% | 6.8% |
  | grosor del tilde vs anillo | igual | 1.28× |
  | punta del tilde | se sale del círculo | queda adentro |

  No se puede acercar el SuccessTick a lucide sin romper el spec, que pide
  explícitamente el tilde 1.28× más gordo que el anillo. Así que la corrección va
  al revés: los slots ya asistidos usan `<SuccessTick playing={false} />` — su
  estado de reposo es exactamente el frame final — y los vacíos usan
  `<SuccessTickRing />`, el anillo solo. Los tres estados del slot salen del mismo
  archivo y no pueden divergir.

- **Tamaño óptico en el modal.** El anillo ocupa el 50% del viewBox, así que para
  llenar un slot de 20px (`size-5`) como lo haría un ícono normal el SVG va a 36px
  y se centra en absoluto, sin afectar el layout de la fila.

## Consideraciones de seguridad

No se identifican implicaciones de seguridad. El cambio es puramente de
presentación: no toca auth, no lee ni escribe datos, no introduce dependencias
nuevas y no modifica superficie de red. El `<style>` inline es una constante de
módulo — no interpola input del usuario.

## Lecciones aprendidas

- **`transform-origin` en CSS rompe el `transform="rotate(a cx cy)"` del SVG.**
  En SVG2 el atributo `transform` y la propiedad CSS son la misma cosa, así que
  declarar `transform-origin: 120px 120px` en una regla que matcheaba el anillo y
  los rayos desplazaba sus rotaciones — el anillo aparecía fuera de centro.

- **Corolario, y el bug que llegó a testing.** El primer arreglo fue quitar el
  `transform-origin` del anillo y dejar que aplicara el default. Eso funciona en
  Chrome (`view-box` → origin `0 0`) pero **depende de un default que no todos los
  motores resuelven igual**. El segundo intento fue declarar el origin explícito y
  pasar los atributos a `rotate(deg)` sin centro — correcto en teoría, pero
  cualquier caso donde el CSS y el markup no estén sincronizados deja el anillo
  rotando sobre `(0,0)` y volando fuera del cuadro.

  **La conclusión no fue "declarar bien el origin" sino sacar las rotaciones.** El
  anillo pasó a ser un path de dos semiarcos que ya arranca a la 1 en punto, y
  cada rayo se dibuja ya en su ángulo y viaja con `translate()` — que es la única
  función de transform que no depende del `transform-origin`. El único
  `transform-origin` que queda es el del overshoot del tilde, donde un error de
  origin sería un corrimiento sub-pixel durante 100ms.

  Regla general: en SVG animado, **la geometría se calcula, no se rota**. Un
  `rotate()` en un ícono chico es una dependencia silenciosa del motor con un modo
  de falla desproporcionado (el elemento desaparece del cuadro).

- **React 19 no actualiza un `<style href>` que ya está en el head.** El hoisting
  con `precedence` deduplica por `href`: si el href ya fue insertado, el contenido
  nuevo se ignora. Con un href fijo, el Fast Refresh traía el markup nuevo y dejaba
  el CSS viejo — o sea, la combinación exacta que estábamos debuggeando, con
  markup y CSS de versiones distintas. Se resolvió derivando el href de un hash
  del contenido: cada versión del CSS es un recurso distinto y la deduplicación
  entre instancias se mantiene.

- **`stroke-linecap: round` con `dashoffset == largo del path` dibuja un punto.**
  Durante el hold inicial (0 → 0.12s) el tilde debería ser invisible, pero el cap
  redondo renderizaba un punto verde en el arranque del path. Se resuelve con
  `opacity: 0` + `animation-timing-function: step-end` en el frame 0.

- Ambos bugs eran invisibles en el código y obvios en pantalla. Se detectaron
  renderizando el CSS generado en un HTML aparte y screenshoteando el timeline
  frame por frame (pausando `document.getAnimations()` y seteando `currentTime`).

## Plan

### Pasos

1. Crear `src/components/SuccessTick.tsx` con la geometría, el `TIMELINE` y el
   generador de keyframes por variante.
2. Verificar el timeline frame por frame contra los criterios de aceptación:
   anillo sin draw-on, salida asimétrica, loop sin salto, legible a 24px y 240px,
   `prefers-reduced-motion` en estado final.
3. Reemplazar el `CheckCircle2` + `zoom-in-50` del slot nuevo en
   `AssistanceModal` por `<SuccessTick exit={false} />` con tamaño óptico
   equivalente.
4. `npm run type-check` + `npm run lint`.

## Archivos creados / modificados

| Acción | Archivo |
|--------|---------|
| creado | `src/components/SuccessTick.tsx` — `SuccessTick` + `SuccessTickRing` |
| modificado | `src/home/components/v2/AssistanceModal.tsx` — `SlotIcon` reemplaza los íconos de lucide en los tres estados del slot |
