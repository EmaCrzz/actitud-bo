/**
 * Origen del período de una membresía.
 *
 * `customer_membership.start_date` existe desde la migración 20260918120000
 * (brecha B12 del plan v2), pero **sin backfill**: las 539 membresías anteriores
 * a esa fecha lo tienen en `NULL`. Inventarles un inicio habría sido fabricar un
 * dato que nadie midió — para un cliente cuyo pago se registró tarde, el
 * "inicio" copiado de `last_payment_date` quedaría después del inicio real.
 *
 * Así que durante toda la vida del histórico conviven dos orígenes, y la
 * pregunta "¿cuándo empezó este período?" no se responde leyendo una columna.
 * Esta función es la única respuesta: cualquier lectura del inicio del período
 * pasa por acá.
 *
 * Existe como helper y no como expresión inline porque el fallback tiene que ser
 * idéntico en todos los consumidores. Si el perfil usa `start_date ?? last_payment_date`
 * y un reporte usa sólo `last_payment_date`, los dos muestran números distintos
 * para el mismo cliente y nadie se entera — el mismo perfil de bug silencioso
 * que las fechas sin canonicalizar.
 */
export interface MembershipPeriodSource {
  start_date?: string | null
  last_payment_date?: string | null
}

/**
 * Inicio del período vigente, o `null` si no hay con qué determinarlo.
 *
 * `null` es un resultado legítimo, no un error: una membresía VIP nunca tuvo un
 * pago, y un alta anterior a la Fase 7 pudo no tener ninguno de los dos campos.
 * Los consumidores tienen que decidir explícitamente qué muestran en ese caso,
 * en vez de recibir una fecha inventada.
 */
export function getMembershipPeriodStart(membership: MembershipPeriodSource): string | null {
  return membership.start_date ?? membership.last_payment_date ?? null
}
