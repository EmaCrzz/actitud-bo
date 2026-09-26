# Tests e2e de fechas de cobro y mes contable

**Fecha:** 2026-09-26
**Autor:** ema_villanueva@hotmail.com
**Rama:** chore/e2e-cobro-y-mes-contable

## Descripción

La suite e2e montada en `20260926131436` cubre flujos verificando la pantalla. Este trabajo agrega los cuatro tests que la pantalla **no puede** dar: los que vigilan en qué día y en qué mes contable quedan registrados los cobros.

El bug que persiguen es el de canonicalización de fechas documentado en `20260709153000`, y la razón de existir de estos tests es que **es invisible por UI**. Cuando un `"YYYY-MM-DD"` del datepicker viaja crudo al RPC, Postgres lo lee como medianoche UTC y lo guarda tres horas antes del intent. El panel confirma, el monto es correcto, el pago aparece en la lista. Lo único que cambió es un timestamp que ninguna pantalla muestra.

Ya reincidió una vez: 91 pagos desalineados por no aplicar la regla en un call site nuevo. Es exactamente la clase de defecto que sobrevive meses en producción, porque no hay síntoma que alguien pueda reportar.

## Decisiones

### Decisiones de negocio

- **Se vigila la separación entre `period_start` y `payment_date`**, que es la que fijó el ADR `20260925103921`: el mes contable es cuándo entró la plata (criterio de caja), y el período es a qué cuota corresponde. Un test verifica que no vuelvan a colapsar en un solo valor, que es lo que causó el issue #59.

- **Se vigila que la renovación agregue un pago y no pise el anterior**, regresión documentada en `20260922125530`.

### Decisiones técnicas

- **Estos specs asertan contra la DB, no contra la UI.** Es una excepción deliberada al criterio del resto de la suite, y la justificación es que no hay alternativa: ninguna pantalla muestra el timestamp almacenado. Se consideró verificarlo indirectamente —que el pago aparezca en el balance del mes— y se descartó: un desfase de tres horas sólo cambia de mes cuando el cobro cae en los primeros días, así que un test por UI pasaría casi siempre y fallaría de forma aparentemente aleatoria unos pocos días al mes. Peor que no tenerlo.

  **El costo es acoplamiento al esquema**: si se renombra `period_start`, estos tests se rompen aunque la app funcione. Se acepta a cambio de cubrir un bug con historial de reincidencia y daño real.

- **Lectura como el usuario admin, no con `service_role`.** `e2e/support/db.ts` se loguea con las mismas credenciales que la suite, así que las políticas de RLS siguen vigentes y los tests leen exactamente lo que la app puede leer. Además evita meter una service key en el entorno local.

- **Se compara contra lo que la UI tenía elegido, no contra una fecha fija.** El flujo de renovación devuelve el `"YYYY-MM-DD"` leído del `<input type="hidden">` del DatePicker —el mismo valor que viaja en el FormData— y el test asierta que el día guardado coincide. Dos ventajas sobre hardcodear una fecha: el test vale cualquier día del mes en que se corra, y compara el intent real del operador contra el efecto, que es justo lo que el bug rompe.

- **Los helpers de fecha del spec importan `@/lib/timezone`.** Si el spec reimplementara la conversión a hora argentina, un bug en `timezone.ts` quedaría invisible: el test estaría comparando contra su propia copia del mismo error.

- **El mensaje de fallo nombra la causa.** Un diff pelado ("esperaba 2026-10-01, recibí 2026-09-30") no comunica de qué se trata. `dateMismatchHint` imprime el valor elegido, el guardado, su equivalente en hora argentina, la causa típica y el ADR de referencia.

## Consideraciones de seguridad

- **Autenticación / Autorización:** el cliente de lectura usa las credenciales del usuario admin ya existente, bajo RLS. No se agregan usuarios, permisos ni service keys.
- **Exposición de datos:** los specs leen filas de clientes creados por ellos mismos, identificados por el DNI que generan. No leen ni imprimen datos de personas reales.
- **Validación de input:** no aplica; no se introduce manejo de input no confiable.
- **Dependencias:** ninguna nueva. `@supabase/supabase-js` ya era dependencia del proyecto.
- **Infraestructura:** sin cambios. Los registros que crean estos specs se limpian con `npm run test:e2e:clean`, igual que los del resto de la suite.

## Lecciones aprendidas

- **Los tests se validaron rompiendo el código a propósito.** Se reemplazó temporalmente `parseAppTzDateString(datePart).toISOString()` por el string crudo en `isoDateToAppTzTimestamp`, y el spec falló reportando:

  ```
  elegido en la UI: 2026-10-01
  guardado:         2026-09-30 en America/Argentina/Buenos_Aires
  ```

  Es decir: reprodujo el bug histórico **cruzando el límite de mes**, que es el caso que causa daño contable. La mutación se revirtió. Vale como precedente: un test de regresión que nunca se vio fallar no prueba que detecte nada, y para un bug silencioso esa verificación es el único modo de saber que el test sirve.

- **Volvió a aparecer la ambigüedad por substring** que ya documentó el ADR anterior: `getByText('Resumen')` del panel de cobro matcheaba "Resumen del día" del home que queda detrás. Refuerza que conviene `exact` por defecto en textos cortos.

## Plan

### Pasos

1. `e2e/support/db.ts`: cliente de supabase-js autenticado como admin, con lectura del último pago y conteo de pagos por DNI.
2. `e2e/support/dates.ts`: conversión de timestamp guardado a día/mes calendario argentino, reusando `@/lib/timezone`, y el mensaje de fallo accionable.
3. `renewMembershipViaUI` en `e2e/support/flows.ts`, devolviendo las fechas elegidas en los datepickers.
4. `e2e/specs/payment-accounting.spec.ts` con los cuatro casos.
5. Validar por mutación que el spec detecta la regresión, y revertir.
6. `type-check` y `lint` contra el baseline.

### Estado

19 tests en verde (~2.1 min), los 4 nuevos incluidos.

### Pendiente

- Specs de permisos con el usuario no-admin, cuando se cargue.
- Limpieza automática al terminar la suite (`globalTeardown`), hoy manual vía `npm run test:e2e:clean`.
- GitHub Action en cada PR — conviene resolver antes la limpieza automática, porque correr en cada PR multiplica el residuo en la base que comparten dev y preview.
