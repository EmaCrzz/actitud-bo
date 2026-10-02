# El grupo familiar pasa a ser una promoción que se elige al cobrar

**Fecha:** 2026-10-02
**Autor:** ema_villanueva@hotmail.com
**Rama:** feat/v2-descuento-por-promocion

## Descripción

La Fase 10b del plan v2 iba a portar los grupos familiares de v1: un tab
`Grupos` en Clientes, listado, panel de edición, baja lógica y tres columnas
derivadas (`Tipo de plan` / `Vencimiento` / `Estado`) que la decisión #17 nunca
pudo cerrar. Al retomarla quedaron dos preguntas sin respuesta en el modelo:
**quién es el titular** del grupo, y **qué pasa con el grupo** cuando un
integrante vence y no vuelve.

Se midió producción antes de responderlas (2026-10-02, consultas de sólo
lectura). Los datos cambiaron la pregunta:

| Dato | Valor |
|---|---|
| Grupos activos | 13 (12 de dos personas, 1 de tres) |
| Clientes en grupos | 27, de los 101 que pagaron en septiembre (~27%) |
| Descuentos por mes (jul / ago / sep) | 10 / 16 / 13 — $20.000 / $32.000 / $26.000 |
| Reglas en uso | Una sola: "2do integrante grupo familiar", fija en $2.000. Cero descuentos ad-hoc |

**No existe un titular: existe un orden de pago.** Separando cada grupo y mes
por el orden en que pagaron sus integrantes:

| Situación | Pagos | Con descuento |
|---|---|---|
| Paga uno solo del grupo ese mes | 5 | 0 |
| Primero en pagar, cuando pagan varios | 28 | 3 |
| Segundo o tercero en pagar | 34 | 31 |

En 25 de esos 34 el segundo pagó a menos de diez minutos del primero: vienen
juntos al mostrador. El descuento además rota entre integrantes de un mes a
otro. La regla real del negocio es *"si la familia paga junta, el primero
paga completo y los demás tienen el descuento"*, y vive en la cabeza de quien
cobra.

**La sugerencia del sistema contradecía esa regla en ~45% de los casos.** v1 y
v2 preseleccionaban el descuento para cualquier integrante de un grupo con dos o
más miembros activos (`resolveApplicableDiscount`), sin mirar el orden ni si
alguien más pagó. Eso choca con los 28 "primeros" y los 5 "solos": ~30 de 67
cobranzas en las que el operador tuvo que destildarlo. Un grupo cuyos dos
integrantes no volvieron desde julio sigue figurando como activo, y si uno
regresa solo la app le sugiere el descuento igual.

Este cambio saca a v2 del modelo de grupos: **"grupo familiar" es una
promoción del catálogo, que quien cobra elige en el select "Promociones" que el
Figma ya tenía dibujado en el panel de renovación**. La Fase 10b se cancela y
el catálogo de promociones pasa a la Fase 14 (Configuración → Promociones).

## Decisiones

### Decisiones de negocio

- **Un solo mecanismo para el descuento familiar, no tres.** Se compararon
  tres formas de modelar la misma tarea:
  1. *Grupos como entidad* (lo que había). Requiere ABM, baja lógica, derivar
     columnas de varios integrantes y un criterio de titular que el negocio no
     usa. Sostiene una sugerencia que falla casi la mitad de las veces y un
     registro de vínculos que no alimenta ningún reporte.
  2. *Planes paralelos* ("Grupo familiar 3 días"). Descartado: el plan es por
     persona, así que no puede expresar "el primero paga completo". Aplicado a
     los 27 integrantes, el descuento pasaría de ~$26.000 a ~$54.000 por mes.
     Además multiplica el catálogo (familiar × 2/3/5 días, cada uno con
     recargo y media membresía), no sirve para el grupo con dos planes
     distintos, y mezcla el cupo semanal con el motivo del descuento.
  3. *Descuento con motivo al cobrar*. **Elegido.** Es lo que ya pasa en la
     práctica y el schema ya lo soporta (`discount_rule_id`, `discount_note`).
- **Promoción y descuento manual son excluyentes.** El Figma dibuja los dos
  campos, pero el pago guarda una sola regla y un solo monto. Sumarlos dejaría
  el monto manual atribuido a la promo en el desglose de Balance. Elegir uno
  deshabilita el otro, con el motivo a la vista.
- **Las dos opciones arrancan vacías.** Con la sugerencia, un olvido regalaba
  un descuento sin que nadie lo note. Con la promo a elegir, un olvido hace que
  el cliente pague $2.000 de más y lo reclame: el error se corrige solo.
- **Nota opcional al elegir la promoción** (decisión de Ema). Sirve para dejar
  con quién vino la familia sin volver obligatorio un paso que hoy no existe.
- **Se resigna el registro de quién va con quién.** Hoy no lo consume ningún
  reporte. Si alguno lo pidiera, el camino es un campo "pagó junto con
  [cliente]" en el pago, no reconstruir grupos.
- **Ninguna pregunta del modelo de grupos queda abierta.** No hace falta
  titular, y un integrante vencido no importa: si viene uno solo, no se elige
  la promo.

### Decisiones técnicas

- **Sin migración.** `discount_rules` ya era un catálogo: su `CHECK` de julio
  admite `applies_to IN ('group_member', 'manual', 'promo')`, y la lectura está
  abierta a `authenticated` desde `20260722121000`. El panel lista **todas las
  reglas activas**, sin filtrar por `applies_to`, así que la regla existente
  aparece como promoción sin tocarla.
- **La regla conserva su nombre.** Renombrarla a "Grupo familiar" sería un
  UPDATE a mano en prod. Lo hará el ABM de Promociones de la Fase 14 desde la
  UI. Los 39 pagos históricos siguen apuntando a la misma fila, así que el
  Balance los agrupa bajo el mismo concepto antes y después.
- **v1 no cambia.** Su formulario, su sugerencia por grupo y sus pantallas de
  grupos siguen como estaban; `resolveApplicableDiscount` queda como código de
  v1 y se retira con él en la Fase 15. El cliente de browser
  `fetchApplicableDiscount`, que sólo usaba v2, se borró y lo reemplaza
  `fetchActiveDiscountRules`.
- **El monto de la promo se calcula contra el bruto vigente** con
  `computeDiscountAmount`, en `resolveRenewalAmounts`. Una regla `percent`
  da otro número si cambia el plan o la modalidad, y el label del select, el
  resumen y el total salen del mismo cálculo.
- **`resolveRenewalAmounts` hace ganar a la promo** si el estado llegara a
  tener los dos. La pantalla no lo permite; es la red para que el Balance no
  atribuya plata a una regla que no la generó.
- **Resumen y comprobante** muestran el nombre real de la promo con su monto,
  en la fila "Promoción". El monto va en esa fila o en "Descuento", nunca en las
  dos.

## Consideraciones de seguridad

- **Autenticación / Autorización:** sin cambios. El RPC de pago sigue validando
  lo mismo, y la lectura de `discount_rules` ya era abierta a `authenticated`.
  Que cualquier operador pueda elegir una promoción no es nuevo: antes podía
  dejar tildada la sugerida o cargar un monto manual con motivo.
- **Exposición de datos:** ninguna nueva. El catálogo de promociones no
  contiene datos de clientes.
- **Validación de input:** la nota de la promo viaja al mismo `discount_note`
  que ya validaba el RPC. El monto no lo tipea el operador: sale de la regla.
- **Dependencias / Infraestructura:** no aplica.

## Lecciones aprendidas

- **Medir cómo se usa una función antes de portarla.** El relevamiento de la
  10b del 2026-09-29 midió los grupos pero no el orden de pago, y por eso
  terminó en una pregunta de diseño (la #17) en vez de en la respuesta. La regla
  real estaba en los `created_at` de los pagos.
- **Una sugerencia que el operador corrige la mitad de las veces no es una
  ayuda.** El costo no se veía porque cada corrección es un click; el riesgo era
  que el olvido fallaba hacia el lado silencioso.

## Plan

### Pasos

1. `fetchActiveDiscountRules` en `src/group/api/client.ts`, reemplazando
   `fetchApplicableDiscount`.
2. `RenewalFormValues.promotion_id` y `resolveRenewalAmounts({ promotion })`
   en `src/membership/renewal.ts`, con la promo ganando sobre el manual.
3. Panel: catálogo cacheado y promoción y descuento arrancando vacíos.
4. Paso 1: el select "Promociones" habilitado, la nota opcional y la
   exclusión con el manual (`AmountChoiceField` gana `disabled`).
5. Resumen y comprobante con el nombre de la promo.
6. Unit tests de montos (validados por mutación: 5 de 5) y spec e2e
   `renewal-promotion.spec.ts`, que verifica regla, monto y nota contra la DB.
   Las promociones `[E2E]` se suman a `scripts/e2e-clean.sql`.
7. PLAN.md: la 10b se cancela, la #17 se cierra por obsoleta y la 14 absorbe
   el caso.
