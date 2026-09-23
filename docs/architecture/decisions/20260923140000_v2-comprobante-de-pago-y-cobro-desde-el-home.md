# Comprobante de pago y cobro desde el home (v2, Fase 8 — cierre)

**Fecha:** 2026-09-23
**Autor:** emanuel@getlenk.com
**Rama:** feat/v2-comprobante-y-pago-desde-home

## Descripción

Segunda y última mitad de la Fase 8. El PR anterior ([20260922173000](20260922173000_v2-panel-de-renovacion-de-membresia.md)) entregó el panel de renovación con su entrada desde el perfil del cliente. Faltaban tres piezas, y son las que trae este:

1. **El comprobante de pago** — la única pieza del rediseño pensada para salir de la app, compartible como imagen.
2. **La entrada desde el home** — el buscador de cliente que precede al formulario cuando no se viene de una ficha.
3. **El dialog de éxito con la forma del diseño** — centrado, con el check verde, y el botón `Compartir` que hasta ahora no existía.

**Sin migraciones.** Como el PR anterior, trabaja contra el schema que ya está en producción.

## Decisiones

### Decisiones de negocio

- **El comprobante lleva número, que el diseño no dibuja.** `receipt_number` (formato `YYYY-NNNNN`) existe desde la migración `20260921101140` y es exactamente lo que resuelve: un comprobante sin número no se puede rastrear hasta la fila que lo respalda. Emitirlo sin él habría dejado la columna sin propósito.

- **Se comparte como imagen, no como PDF.** El ícono del Figma dice PDF; el destino real es WhatsApp, donde una imagen se previsualiza en el chat y un PDF hay que abrirlo. Meter una librería de PDF al bundle no se justifica para eso. El precedente ya está en producción: el top de asistencias de v1 usa el mismo camino.

- **El comprobante se muestra antes de compartirse.** El flow del Figma va `Modal Dialog` → `Payment Receipt`, y se respetó: al tocar `Compartir` el dialog cambia a la vista del comprobante a tamaño real, y desde ahí se manda. No es un paso de más — lo que sale es una imagen que le llega al cliente, y es la única oportunidad de notar que dice otro monto o el nombre equivocado.

- **Una renovación VIP no ofrece compartir.** VIP extiende el período sin escribir en `membership_payments` —el plan vale 0 y la tabla exige `amount > 0`—, así que no hay pago que respalde el papel. El dialog muestra la confirmación con una sola acción.

- **La fecha del comprobante es el día de emisión**, que para un cobro recién registrado es su `created_at`. La decisión previa era leer `created_at` de la fila; se cambió al verificar que **`membership_payments` es admin-only por RLS** (migración `20260702120000`) y el comprobante tiene que funcionar para cualquier operador. La única fila donde las dos fechas pueden diferir es un re-cobro del mismo período —que conserva su número original—, y hoy no existe ninguna pantalla que reimprima comprobantes viejos. Cuando exista, vivirá en el tab Pagos del perfil, que ya es admin-only, y ahí sí leerá `created_at`.

### Decisiones técnicas

- **El buscador vive dentro del mismo panel, no en un componente aparte.** `RenewMembershipPanel` recibe `customer: RenewableCustomer | null`: con cliente arranca en el stepper, sin cliente arranca en el buscador y después sigue idéntico. Es la misma forma que tomó el alta en la Fase 7, y es lo que sostiene la lectura de que las 10 pantallas del Figma "Desde el home" y las 7 "Desde Cliente/Perfil" son **un flow con dos entradas**: las tres de más son exactamente este paso.

- **El buscador usa `fetchCustomersPage`, no `useCustomerSearch`.** El motivo es la fila: el diseño la dibuja con el plan y el badge de estado, y `useCustomerSearch` —el de la búsqueda de asistencias— devuelve `Customer` pelado, sin membresía. Traerla por el query canónico del listado (Fase 6a) además hace que el estado que se ve acá sea **el mismo** que el del listado y el del perfil, porque sale del mismo cálculo.

- **Volver del formulario al buscador descarta lo cargado.** El prefill del período, la sugerencia de recargo y el descuento se calcularon para el cliente anterior; arrastrarlos al siguiente cobraría con los números de otra persona.

- **El buscador no tiene footer.** La acción es elegir una fila; un `Siguiente` deshabilitado al pie sería un botón muerto ocupando el lugar donde después aparece el que sí sirve.

- **Todos los colores del comprobante van literales, no con tokens.** `html-to-image` serializa los estilos computados, y una CSS var que resuelva distinto —o no resuelva— fuera del árbol de `[data-v2]` saldría en el PNG como negro o transparente. Es el único componente de la v2 donde eso está bien, y está anotado en el archivo para que nadie lo "arregle".

- **El comprobante mide 390px fijos**, igual en desktop que en mobile. Lo que sale no es una pantalla sino una imagen: un ancho responsive produciría comprobantes de tamaños distintos según desde dónde se emitieron.

- **`useShareImage` se extendió en vez de duplicarse.** Hardcodeaba `400×600` y siempre descargaba (el share nativo estaba comentado, sin explicación). Ahora acepta `width`/`height` opcionales —omitirlos deja que `toPng` mida el elemento, que es lo que necesita un comprobante de alto variable— y un flag `share` que intenta la hoja nativa del sistema y cae a la descarga. **Los defaults preservan el comportamiento exacto del top de asistencias**, que ya está en producción.

- **El `AbortError` del share nativo se trata como éxito.** Es el usuario cerrando la hoja de compartir, no un fallo: descargarle el archivo igual, o peor mostrarle un error, es responder a "no quiero" con "acá tenés".

- **`RenewSuccessDialog` no usa `ConfirmDialog`.** Acá no hay nada que confirmar —la operación ya ocurrió— y el layout de `ConfirmDialog` es de pregunta: título a la izquierda, sin ilustración. El diseño de éxito es centrado, con el check verde como protagonista. El `showCancel` que el PR anterior le agregó a `ConfirmDialog` queda igual: lo sigue usando quien lo necesite.

### Divergencias deliberadas contra el Figma

1. **El comprobante lleva número de comprobante** (arriba).
2. **La marca es el círculo del sidebar + el nombre del negocio**, no el wordmark "ACTITUD" ni la marca de agua del isotipo: **esos assets no existen en el repo**. Sale del mismo `v2.sidebar.brandName` que el resto de la app, así que el segundo tenant lo hereda sin tocar el archivo. **Pedirle al diseñador que exporte el wordmark y el isotipo a `public/`.**
3. **`Membresía` muestra el nombre del plan y `Modalidad de cobro` su precio base**, igual que el resumen del paso 2. En el diseño las dos pantallas se contradicen para la misma operación (defectos #3, #4 y #6 del PR anterior).
4. **Se comparte una imagen, no un PDF** (arriba).

## Auditoría de timezone

Una sola fecha nace en esta fase:

| Call site | Qué pasa | Helper |
|---|---|---|
| `issuedOn` del comprobante | Día calendario AR del momento de emisión, no `toISOString().slice(0,10)` | `getTodayIsoDateInAppTz()` |

El resto de las fechas del comprobante son de presentación (`formatCalendarDate`, que no convierte zonas) y ninguna se envía a la DB — el comprobante sólo lee lo que el panel ya calculó y guardó.

## Consideraciones de seguridad

- **Autenticación / Autorización:** sin cambios. El comprobante **no lee `membership_payments`** justamente por su RLS admin-only: se arma con lo que el panel ya tiene en pantalla más el `receipt_number` que devuelve el RPC. Eso es lo que permite que un operador sin permisos de finanzas emita el comprobante de un cobro que sí puede registrar.
- **Exposición de datos:** el comprobante sale de la app como imagen, y contiene nombre del cliente, plan, montos y número de comprobante — exactamente lo que un comprobante tiene que decir. **No incluye DNI, teléfono ni ningún otro dato personal** que el operador no vaya a entregar de todas formas. El buscador muestra las mismas columnas que el listado, que ese operador ya puede ver.
- **Validación de input:** ninguna entrada nueva. El buscador pasa el texto por `fetchCustomersPage`, que es el query canónico ya rate-limitado (`search`, 30/min).
- **Dependencias:** ninguna nueva. `html-to-image` ya era dependencia y se sigue importando de forma dinámica, fuera del bundle inicial.
- **Infraestructura:** sin cambios. **Ninguna migración.**

## Lecciones aprendidas

- **La decisión de leer `created_at` no sobrevivió al contacto con RLS.** Estaba anotada en el plan y en el ADR anterior como la salida limpia al issue #59, y era correcta salvo por un detalle que no se había verificado: `membership_payments` es admin-only desde `20260702120000`, así que el operador que emite el comprobante muchas veces no puede leer la fila que acaba de crear. El dato correcto estaba disponible, pero no para quien lo necesitaba.

- **Radix no avisa cuando el cierre no lo dispara el usuario.** El dialog de éxito guarda si está mostrando el comprobante, y ese estado se limpiaba en `onOpenChange` — que Radix **no** llama cuando el prop `open` cambia por su cuenta, que es justo lo que pasa al cerrar desde el panel. La segunda renovación de la sesión habría abierto directo en la vista del comprobante.

## Plan

### Pasos

1. Extender `useShareImage` con tamaño opcional y share nativo, preservando los defaults del caller existente.
2. `PaymentReceipt.tsx` — 390px fijos, colores literales, con `receipt_number`.
3. `RenewSuccessDialog.tsx` — dos vistas sobre un `Dialog`: resumen y comprobante.
4. `RenewCustomerSearchStep.tsx` sobre el query canónico del listado.
5. Hacer que `RenewMembershipPanel` acepte `customer: null` y arranque en el buscador.
6. Enganchar la acción rápida del home.
7. Verificar: `type-check`, `lint` (0 warnings nuevos), `build`.

### Lo que queda fuera, y sigue anotado

- **Issue [#59](https://github.com/EmaCrzz/actitud-bo/issues/59)** — `payment_date` recibe el inicio del período. **Decidido el 2026-09-23: el mes contable pasa a ser cuándo entró la plata (criterio de caja).** Se ejecuta en el PR siguiente, antes de la Fase 9. Detalle en [docs/v2/PLAN.md](../../v2/PLAN.md).
- **Reimprimir un comprobante viejo** desde el tab Pagos del perfil. Cuando exista, ahí sí lee `created_at` — ese tab ya es admin-only.
- **`POST /api/accounting/payments`**, roto y sin llamadores.
- **Los assets de marca** — wordmark e isotipo, a exportar desde Figma.
