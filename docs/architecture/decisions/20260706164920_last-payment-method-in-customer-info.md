# Mostrar forma de pago y último pago del cliente

**Fecha:** 2026-07-06
**Autor:** ema_villanueva@hotmail.com
**Rama:** feat/registro-info-pago

## Descripción

El tab "Información" del registro de asistencias mostraba datos que no
coincidían con el diseño de Figma: se separaba Nombre/Apellido en dos filas,
había un campo "Tipo de Membresía" innecesario, y faltaban dos campos que el
negocio pidió exponer — la forma de pago con la que se pagó la última cuota
y la fecha de ese último pago.

Adicionalmente, al llevar el detalle a producción aparecieron dos bugs
relacionados que se corrigieron en la misma rama:

1. En el form de edición de membresía (`/customer/edit/[id]/membership`),
   el select "Forma de pago" arrancaba vacío incluso cuando el cliente ya
   tenía un método registrado. El `HybridSelect` de `payment_type` no
   recibía `defaultValue`, y el dato tampoco vivía en `customer_membership`
   sino en `membership_payments`.
2. Después de renovar la membresía cambiando el método de pago, el detalle
   del cliente seguía mostrando el método viejo. La query del detalle
   ordenaba por `payment_date` DESC, pero `payment_date` viene del
   `start_date` que el form prellena con el `last_payment_date` anterior.
   Como el usuario rara vez tocaba ese input, todas las renovaciones
   quedaban con el mismo `payment_date` — o peor, con uno más antiguo que
   un pago histórico — y el "último pago" mostrado nunca cambiaba.

## Decisiones

### Decisiones de negocio

- El tab "Información" del cliente muestra:
  - **Nombre y apellido** en una sola fila (`membership.fullName`).
  - **DNI**, **teléfono** — sin cambios.
  - **Forma de pago de la membresía** — el método del último pago
    registrado, traducido (`Efectivo`/`Transferencia` en español,
    `Cash`/`Transfer` en inglés).
  - **Último pago registrado** — la fecha `customer_membership.last_payment_date`.
- Fallback `"-"` cuando el cliente no tiene pagos registrados (típicamente
  VIP nuevos o clientes recién creados).
- Se elimina el campo "Tipo de Membresía" del tab: ya se muestra arriba en
  el bloque de membresía.

### Decisiones técnicas

- **Origen de la forma de pago:** viene de `membership_payments`, no de
  `customer_membership`. La renovación inserta la fila en esa tabla y no
  duplica el método de pago en `customer_membership`. Se extiende
  `searchCustomersById` con una query paralela dentro del mismo
  `Promise.all`, y se agrega `last_payment_method: string | null` a
  `CustomerComplete`.
- **Traducción del método de pago:** se usa `PaymentsTranslation` + `t()`
  con fallback al valor crudo. Un primer intento con las claves
  `efectivo`/`transferencia` no matcheaba porque los valores reales son
  `PAYMENT_CHASH`/`PAYMENT_TRANSFER`; se corrigió apuntando el mapa a las
  constantes reales.
- **Ordering del "último pago":** se ordena por `created_at` DESC en lugar
  de `payment_date` DESC. `created_at` es el timestamp de inserción en la
  DB — es único, monotónico, y refleja el pago más recientemente registrado
  con independencia de qué fecha "lógica" haya elegido el operador. Se
  descartó ordenar por `payment_date` con `created_at` como desempate
  porque no resolvía el caso donde un pago histórico tiene una
  `payment_date` mayor que la de un pago nuevo (ver Lecciones aprendidas).
- **Default del select en el form:** el `HybridSelect` de `payment_type`
  ahora recibe `defaultValue={customer?.last_payment_method || ''}`,
  siguiendo el mismo patrón que ya usa el select de `membership_type` en
  la línea de arriba.
- **Alternativa descartada** para el bug del ordering: cambiar el default
  del input `start_date` del form a "hoy" en lugar de al
  `last_payment_date` anterior. Hubiera sido el arreglo del root cause
  conceptual (`p_start_date` debería ser la fecha del pago actual), pero
  tenía riesgo de romper flujos donde el operador quiere registrar un
  pago retroactivo. Se prefirió el fix mínimo en la query del detalle.

## Consideraciones de seguridad

- **Autenticación / Autorización:** sin cambios. La query nueva sobre
  `membership_payments` corre con la sesión del usuario autenticado y
  respeta las RLS existentes (SELECT permitido a authenticated).
- **Exposición de datos:** el `payment_method` ya se exponía en la sección
  de contabilidad (`/accounting`). Ahora también se muestra en el detalle
  del cliente al mismo rol de usuario — no hay un nuevo canal de exposición.
- **Validación de input:** no aplica; es solo un cambio de lectura y
  presentación.
- **Dependencias:** no se agregaron dependencias nuevas.
- **Infraestructura:** sin cambios.

## Lecciones aprendidas

- **El caching del router de Next.js 15 fue una falsa pista.** El primer
  diagnóstico del bug de "sigue viendo el método viejo" apuntó al RSC
  cache, pero un hard reload no lo resolvía — señal clara de que el
  problema estaba en la query, no en el cache del cliente.
- **`ORDER BY payment_date DESC` sin desempate era ambiguo, pero el
  problema real era más profundo.** Cuando dos filas tienen el mismo
  `payment_date` el orden es no determinístico; se agregó un tie-breaker
  por `created_at` como intento intermedio, pero la evidencia dura del
  `SELECT` mostró que la fila "vieja" tenía en realidad un `payment_date`
  **mayor** que la nueva. El fix intermedio se descartó a favor de ordenar
  directamente por `created_at`.
- **El `start_date` del form es fecha del pago, no fecha del período.** El
  RPC lo usa tanto para `customer_membership.last_payment_date` como para
  `membership_payments.payment_date`. Al prellenar con el valor anterior,
  cada renovación pisa el mismo `payment_date` — no rota. Vale la pena
  revisar la UX de ese input en un ADR futuro si el negocio quiere que
  cada renovación quede fechada "hoy" por default.
- **La forma de pago vive en `membership_payments`, no en
  `customer_membership`.** Es fácil asumir lo contrario mirando solo el
  form. Cualquier cambio futuro sobre "métodos de pago del cliente"
  debería considerar que `customer_membership` no tiene ese campo.

## Plan

### Pasos

1. **Feature base** — Extender `searchCustomersById` para traer el
   `payment_method` del último `membership_payments` en paralelo; agregar
   `last_payment_method` a `CustomerComplete`; rediseñar
   `InfoResume` según Figma con los nuevos campos y fallbacks.
2. **Fix de traducción** — Cambiar el mapa `PaymentsTranslation` para que
   use las claves reales (`PAYMENT_CHASH`/`PAYMENT_TRANSFER`) y unificar
   Nombre/Apellido en una fila; limpiar keys i18n huérfanas.
3. **Fix del select vacío** — Agregar `defaultValue={customer?.last_payment_method || ''}`
   al `HybridSelect` de `payment_type` en `membership-form.tsx`.
4. **Fix del "último método" que no cambiaba** — Ajustar la query de
   `searchCustomersById` para ordenar por `created_at` DESC en lugar de
   `payment_date` DESC.
5. **Pruebas locales** — Verificar en `/customer/[id]` que el método y la
   fecha coincidan con el último pago registrado; renovar cambiando de
   método y confirmar que el detalle refleja el cambio; probar cliente
   sin pagos y cliente VIP.
