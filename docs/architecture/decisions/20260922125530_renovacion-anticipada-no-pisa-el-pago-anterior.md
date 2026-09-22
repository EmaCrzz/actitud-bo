# Renovar por adelantado deja de pisar el cobro anterior

**Fecha:** 2026-09-22
**Autor:** emanuel@getlenk.com
**Rama:** fix/renovacion-anticipada-pisa-el-pago

## Descripción

`upsert_customer_membership_with_payment` decide entre **UPDATE** del pago vigente e **INSERT** de uno nuevo con el criterio *"membresía vigente = mismo período"*, puesto en la migración `20260707113341` para frenar un caso real: un cliente con **9 filas duplicadas** del mismo cobro, que inflaban los ingresos del mes a $260.000 cuando se habían cobrado $30.000.

Ese criterio es un proxy, y falla cuando el período cambia sin que la membresía haya vencido. **Renovar unos días antes del vencimiento pisa el cobro anterior y lo borra.** Medido contra un Postgres con el schema real de producción:

```
Cobro de septiembre (vence 30/09) →  1 fila, $20.000, comprobante 2026-00001
El cliente paga octubre el 28/09  →  1 fila, $20.000, fecha 01/10, MISMO comprobante
```

Se cobraron $40.000 y la contabilidad registra $20.000. Septiembre pierde su ingreso, y el comprobante que el cliente ya tiene en el teléfono queda apuntando a una fila con otros montos y otro período.

El defecto es anterior a la v2 y está en producción. Salió a la luz al planificar la UI de la Fase 8: un flow que emite comprobantes no puede construirse sobre un modelo donde un cobro puede sobrescribir a otro.

**Alcance de la exposición.** En producción hay **una** fila con la firma de un pago pisado —creada el 07/08, hoy fechada el 07/09, $24.000— que es consistente con este defecto. No se puede confirmar: el `UPDATE` destruye la evidencia del cobro original. No se repara nada de forma retroactiva por la misma razón; no hay a qué volver.

## Decisiones

### Decisiones de negocio

- **Un cobro de un período nuevo es una transacción nueva**, aunque la membresía siga vigente. Merece su propia fila, su propio comprobante y su propio mes contable. Pagar por adelantado es un caso legítimo y no debería castigarse con pérdida de registro.

- **La idempotencia de julio se conserva, no se revierte.** El caso que la motivó —el operador manda el mismo cobro dos veces, o entra a corregir el método de pago— sigue entrando por UPDATE, porque repite el mismo inicio de período. Lo que cambia es que un cobro de **otro** período deja de contar como corrección.

- **No se bloquea la renovación anticipada en la UI.** Se consideró avisar o impedirla, pero eso trata un caso legítimo del negocio como un error para tapar un defecto del modelo. Con el modelo arreglado, la UI no necesita saber nada.

### Decisiones técnicas

- **El criterio pasa a ser el inicio del período, no la vigencia.** Se compara el `p_start_date` que llega contra el inicio del período ya pago. Si coinciden, es una corrección → UPDATE. Si no, es un período nuevo → INSERT.

- **El inicio del período sale de `COALESCE(start_date, last_payment_date)`** — la misma resolución que `getMembershipPeriodStart()` en TypeScript, que existe precisamente porque `start_date` se agregó sin backfill en la Fase 7. **Medido antes de elegir el criterio:** de las 96 membresías activas con pago vigente en producción, 10 tienen `start_date`, 86 caen al fallback y **ninguna se queda sin las dos**. Si hubiera habido filas sin ninguna, habrían perdido la idempotencia en silencio.

- **La comparación es por día calendario AR**, no por instante. El formulario manda medianoche AR canonicalizada, pero una corrección que llegue con otra hora del mismo día sigue siendo el mismo período. `(x AT TIME ZONE 'America/Argentina/Buenos_Aires')::date` es además la forma indexable, la misma que fijó el ADR `20260917120000`.

- **`v_can_update_current` no cambia de significado.** La condición nueva se agrega **sólo** en el camino con cobro. Reescribir `v_can_update_current` habría sido lo natural y habría roto el cambio de tipo sin pago: esa rama (`ELSIF v_is_type_change AND v_can_update_current`) recibe `p_start_date = NULL`, así que con la condición nueva adentro habría dejado de actualizar el pago al tipo nuevo — una regresión silenciosa sobre una funcionalidad que el ADR de julio pide explícitamente.

- **`CREATE OR REPLACE` y no `DROP` + `CREATE`**, porque la firma no cambia: los mismos 16 parámetros. No puede aparecer un overload nuevo, que es el accidente que este esquema ya pagó una vez.

## Consideraciones de seguridad

No se identifican implicaciones de seguridad. No cambia quién puede llamar a la función ni qué valida; no toca RLS, permisos ni columnas. La función sigue siendo `SECURITY DEFINER` con las mismas guardas, incluida la de VIP.

El único efecto colateral sobre datos es el buscado: donde antes se sobrescribía una fila, ahora se inserta una nueva. Ningún dato existente se modifica ni se migra.

## Lecciones aprendidas

- **Un proxy razonable puede ser exactamente incorrecto en el caso que no se pensó.** "Membresía vigente" y "mismo período" coinciden casi siempre, y por eso la regla sobrevivió dos meses. Coinciden en todos los casos que el ADR de julio tenía sobre la mesa, y dejan de coincidir en el único que no estaba: pagar antes de vencer.

- **Leer por qué existe la regla antes de cambiarla cambió el cambio.** La primera lectura fue "la idempotencia está mal, hay que sacarla". El ADR de julio mostró un caso real de $260.000 inflados, y con eso el trabajo pasó de revertir a **afinar**: el criterio nuevo hace lo que aquel ADR quería decir. Sin leerlo, el fix habría reintroducido el bug que arregló.

- **El riesgo de este cambio no estaba en la condición nueva sino en dónde ponerla.** Modificar `v_can_update_current` —la variable que nombra la idea— es lo natural y rompe una segunda rama que la usa con otro propósito. El síntoma habría sido un cambio de tipo que deja de reflejarse en el pago: silencioso, y sólo visible en contabilidad.

- **Medir antes de elegir el fallback.** El criterio depende de un dato (`start_date`) que el 90% de las filas activas no tiene. Contra la intuición, eso no era un problema —el fallback cubre el 100%— pero de haber existido aunque sea una fila sin ninguno de los dos campos, ese cliente habría perdido la protección contra duplicados sin que nada fallara.

## Plan

### Pasos

1. Derivar la función de la versión vigente (`20260921101140`) de forma programática en vez de retipearla, y diffear el resultado para confirmar que no cambió nada más que lo intencional.
2. Agregar `v_period_start` y `v_same_period`, calculados después de cargar `v_current`.
3. Usar `v_same_period` **sólo** en el `IF` del camino con cobro.
4. Ejercitar los siete escenarios contra un Postgres desechable con el schema real de producción.

### Verificación

Los siete escenarios, todos contra el schema previo de producción más las dos migraciones:

| # | Escenario | Esperado | Resultado |
|---|---|---|---|
| 1 | Cobro inicial | INSERT | ✅ 1 fila |
| 2 | Doble submit del mismo cobro | UPDATE | ✅ sigue 1 fila |
| 3 | Corrección de método y monto, mismo período | UPDATE | ✅ 1 fila, método nuevo |
| 4 | **Renovación anticipada** (paga octubre el 28/09) | **INSERT** | ✅ 2 filas, 2 comprobantes, $45.000 |
| 5 | Cliente histórico sin `start_date`, corrección | UPDATE | ✅ 1 fila |
| 6 | Cambio de tipo sin pago | UPDATE (sin regresión) | ✅ el pago pasa al tipo nuevo |
| 7 | Renovación con membresía vencida (caso común) | INSERT | ✅ fila nueva |

Integridad al cerrar: 4 pagos, 4 comprobantes únicos, 0 filas descuadradas contra el CHECK.

### Riesgo de timezone

La comparación nueva resuelve el día en `America/Argentina/Buenos_Aires` en los dos lados antes de comparar. Sin eso, un cobro canonicalizado a medianoche AR (03:00 UTC) y un `last_payment_date` guardado con otra hora caerían en días UTC distintos y una corrección se convertiría en una fila nueva — el error opuesto al que este ADR arregla, y también silencioso.

### Orden de deploy

Retrocompatible en las dos direcciones: ningún caller cambia, ninguna columna se toca, ningún dato se migra. Puede aplicarse a producción antes del deploy de código, que es el default del proyecto.
