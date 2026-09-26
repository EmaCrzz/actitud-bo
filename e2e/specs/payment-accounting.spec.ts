import { test, expect } from '../support/fixtures'
import { createCustomerViaUI, renewMembershipViaUI } from '../support/flows'
import { findLatestPaymentByPersonId, countPaymentsByPersonId } from '../support/db'
import { toAppTzIsoDate, toAppTzMonthKey, dateMismatchHint } from '../support/dates'
import { getTodayIsoDateInAppTz } from '@/lib/timezone'

/**
 * Fechas de cobro y mes contable.
 *
 * Es el único spec de la suite que asierta contra la DB, y la razón es que el
 * bug que persigue **no se ve en pantalla**. Cuando un "YYYY-MM-DD" del
 * datepicker viaja crudo al RPC, Postgres lo interpreta como medianoche UTC y
 * lo guarda tres horas antes del intent. La UI sigue mostrando todo bien —el
 * panel confirma, el monto es correcto, el pago aparece en la lista— y lo único
 * que cambió es en qué día, y a veces en qué mes contable, quedó registrado.
 *
 * Ya pasó dos veces: el ADR 20260709153000 documenta 91 pagos históricos
 * desalineados por no aplicar la regla en un call site nuevo. Un test que sólo
 * mire la UI es estructuralmente ciego a esto; uno que compare lo elegido
 * contra lo guardado, no.
 *
 * Las dos fechas que verifica son conceptos distintos, y esa separación es la
 * que arregló el issue #59 (ADR 20260925103921):
 *   - `period_start`: cuándo arranca el período — sale del datepicker.
 *   - `payment_date`: cuándo entró la plata — es el momento del cobro.
 */
test.describe('v2 · fechas de cobro y mes contable', () => {
  test('el pago del alta queda en el mes contable en curso', async ({ page }) => {
    const customer = await createCustomerViaUI(page, 'contable')

    const payment = await findLatestPaymentByPersonId(customer.personId)

    expect(payment, 'el alta tiene que haber registrado un pago').not.toBeNull()

    const today = getTodayIsoDateInAppTz()
    const expectedMonth = today.slice(0, 7)

    // Criterio de caja: el mes contable es cuándo entró la plata. Si
    // `payment_date` se corre tres horas y el alta se hace el día 1 antes de
    // las 3 AM, el ingreso aparecería en el mes anterior —uno ya cerrado.
    expect(
      toAppTzMonthKey(payment!.payment_date),
      dateMismatchHint('payment_date', today, payment!.payment_date)
    ).toBe(expectedMonth)

    expect(toAppTzIsoDate(payment!.payment_date)).toBe(today)
  })

  test('el período arranca el día elegido en el datepicker', async ({ page }) => {
    const customer = await createCustomerViaUI(page, 'periodo')
    const { startDate } = await renewMembershipViaUI(page, customer)

    const payment = await findLatestPaymentByPersonId(customer.personId)

    expect(payment).not.toBeNull()

    // El corazón del spec: el día calendario guardado en `period_start` tiene
    // que ser exactamente el que quedó elegido en el datepicker. No se compara
    // contra una fecha fija sino contra lo que la UI mostraba, así que el test
    // vale cualquier día del mes en que se corra.
    expect(
      toAppTzIsoDate(payment!.period_start),
      dateMismatchHint('period_start', startDate, payment!.period_start)
    ).toBe(startDate)
  })

  test('`payment_date` es cuándo se cobró, no cuándo arranca el período', async ({ page }) => {
    const customer = await createCustomerViaUI(page, 'caja')
    const { startDate } = await renewMembershipViaUI(page, customer)

    const payment = await findLatestPaymentByPersonId(customer.personId)

    expect(payment).not.toBeNull()

    // La regresión que reintroduciría el issue #59 es que `payment_date` vuelva
    // a copiar `p_start_date`. Se verifica que sea hoy, que es cuando corre el
    // test; el assert es significativo sólo cuando el período NO arranca hoy,
    // así que ese caso se reporta.
    const today = getTodayIsoDateInAppTz()

    expect(
      toAppTzIsoDate(payment!.payment_date),
      dateMismatchHint('payment_date', today, payment!.payment_date)
    ).toBe(today)

    if (startDate !== today) {
      expect(
        toAppTzIsoDate(payment!.period_start),
        'el período y el cobro son fechas distintas y no deben colapsar en una sola'
      ).not.toBe(toAppTzIsoDate(payment!.payment_date))
    }
  })

  test('la renovación registra un pago nuevo y no pisa el del alta', async ({ page }) => {
    const customer = await createCustomerViaUI(page, 'nopisa')

    expect(await countPaymentsByPersonId(customer.personId)).toBe(1)

    await renewMembershipViaUI(page, customer)

    // El ADR 20260922125530 documenta el caso contrario —una renovación que
    // pisaba el pago anterior— así que el conteo es la forma más directa de
    // vigilar que no vuelva.
    expect(
      await countPaymentsByPersonId(customer.personId),
      'la renovación tiene que agregar una fila, no modificar la existente'
    ).toBe(2)
  })
})
