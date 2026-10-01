import type { Page } from '@playwright/test'
import { test, expect, gotoV2 } from '../support/fixtures'
import { t } from '../support/i18n'
import { E2E_PREFIX, fullName } from '../support/data'
import { deleteSaleByDescription, findSaleByDescription } from '../support/db'
import { toAppTzIsoDate, dateMismatchHint } from '../support/dates'
import { createCustomerViaUI } from '../support/flows'
import { ROUTES_V2 } from '@/consts/routes'
import { PAYMENT_CASH, PAYMENT_TRANSFER } from '@/membership/consts'

/**
 * Sección Ventas (fase 12).
 *
 * Qué cubre y por qué. La fase agrega la tabla `sales` y una sección que lista
 * **todo lo cobrado** —cuotas de `membership_payments` y productos de
 * `sales`— y crea, edita y borra ventas de producto. Los modos de fallo que
 * importan no se ven en pantalla:
 *
 *  1. **La canonicalización de `sale_date`.** Igual que en Gastos: crudo,
 *     Postgres lo leería como medianoche UTC y una venta del día 1 caería en
 *     el mes contable anterior. Se verifica contra la DB.
 *
 *  2. **De quién es la venta.** Con cliente, `customer_id` y nada en
 *     `buyer_name`; sin cliente, al revés. La tabla muestra un nombre en los
 *     dos casos, así que sólo la DB dice si quedó bien atada.
 *
 *  3. **Que las cuotas aparezcan y no se puedan editar desde acá.** Una cuota
 *     se cobra por la renovación; si su fila abriera el panel de venta, el
 *     operador editaría un pago con comprobante emitido desde el lugar
 *     equivocado.
 *
 * Las ventas que crea el spec llevan `[E2E]` en el detalle y las borra el
 * teardown (`scripts/e2e-clean.sql`), además del `finally` de cada test.
 */

function uniqueDescription(label: string): string {
  return `${E2E_PREFIX} ${label} ${Date.now()}`
}

async function openNewSaleMenu(page: Page, option: 'withCustomer' | 'withoutCustomer') {
  await page.getByRole('button', { name: t('v2.sales.new') }).first().click()
  await page.getByRole('menuitem', { name: t(`v2.sales.menu.${option}`) }).click()
  await expect(page.getByRole('heading', { name: t('v2.sales.form.createTitle') })).toBeVisible()
}

/** Completa el paso 1 —detalle— y pasa al resumen. */
async function fillDetailAndContinue(
  page: Page,
  sale: { description: string; amount: number; method: string; buyerName?: string }
) {
  if (sale.buyerName) await page.locator('#sale_buyer_name').fill(sale.buyerName)
  await page.locator('#sale_description').fill(sale.description)
  await page.locator('#sale_amount').fill(String(sale.amount))
  await page.locator('#sale_payment_method').click()
  await page.getByRole('option', { name: sale.method, exact: true }).click()

  await page.getByRole('button', { name: t('common.next'), exact: true }).click()
  await expect(page.getByText(t('v2.sales.review.title'), { exact: true })).toBeVisible()
}

/** Confirma y espera a que el panel termine de cerrarse (ver `createExpenseViaUI`). */
async function confirmAndWaitClose(page: Page, submitLabel: string, successText: string) {
  await page.getByRole('button', { name: submitLabel, exact: true }).click()
  await expect(page.getByText(successText)).toBeVisible()
  await expect(page.getByRole('dialog')).toBeHidden()
}

test.describe('v2 · sección ventas', () => {
  test('la pantalla carga con sus tres KPIs y el rango del mes en curso', async ({
    page,
    consoleErrors,
  }) => {
    await gotoV2(page, ROUTES_V2.V2_SALES)

    await expect(page.getByRole('heading', { name: t('v2.sales.title') })).toBeVisible()
    // Por `dt`: "Efectivo" y "Transferencia" también son el método de cada fila.
    for (const key of ['total', 'cash', 'transfer'] as const) {
      await expect(page.locator('dt', { hasText: t(`v2.sales.kpi.${key}`) })).toBeVisible()
    }

    // El rango arranca el día 1 del mes **AR**, no del UTC.
    const [y, m] = toAppTzIsoDate(new Date()).split('-')

    await expect(page.locator('#sale_filter_from')).toContainText(`01/${m}/${y}`)

    expect(consoleErrors).toEqual([])
  })

  test('una venta sin cliente guarda su fecha canonicalizada, el medio de pago y los datos de referencia', async ({
    page,
    consoleErrors,
  }) => {
    const description = uniqueDescription('Agua')

    try {
      await gotoV2(page, ROUTES_V2.V2_SALES)
      await openNewSaleMenu(page, 'withoutCustomer')

      // El stepper de la renovación, pedido para este flujo. Se verifica por
      // `aria-current` y no por texto: "Detalle de la venta" es a la vez la
      // etiqueta del paso y la del campo.
      const currentStep = page.locator('[aria-current="step"]')

      await expect(currentStep).toHaveText('1')

      await fillDetailAndContinue(page, {
        buyerName: `${E2E_PREFIX} Comprador`,
        description,
        amount: 2500,
        method: t('payments.cash'),
      })

      await expect(currentStep).toHaveText('2')

      // El resumen del diseño muestra la fecha bajo "Método de pago". Acá esa
      // fila tiene que decir el método.
      const methodRow = page.locator('dl > div', { hasText: t('v2.sales.review.method') })

      await expect(methodRow).toContainText(t('payments.cash'))

      await confirmAndWaitClose(page, t('v2.sales.form.submit'), t('v2.sales.success.created'))

      const stored = await findSaleByDescription(description)

      expect(stored, 'la venta no llegó a la DB').not.toBeNull()
      expect(stored?.amount).toBe(2500)
      expect(stored?.payment_method).toBe(PAYMENT_CASH)
      expect(stored?.customer_id).toBeNull()
      expect(stored?.buyer_name).toBe(`${E2E_PREFIX} Comprador`)

      const expectedDay = toAppTzIsoDate(new Date())

      expect(
        toAppTzIsoDate(stored!.sale_date),
        dateMismatchHint('sale_date', expectedDay, stored!.sale_date)
      ).toBe(expectedDay)

      // Y aparece en la tabla con el concepto de producto.
      const cell = page.getByRole('cell', {
        name: t('v2.sales.concept.product', { description }),
        exact: true,
      })

      await expect(cell).toBeVisible()

      // El filtro de concepto (pedido de Ema probando la fase): "Membresías" la
      // saca, "Productos" la vuelve a mostrar. Los dos asserts hacen falta: el
      // negativo solo también pasaría con un filtro que vacía la tabla siempre.
      await page.getByLabel(t('v2.sales.filters.kind'), { exact: true }).click()
      await page.getByRole('option', { name: t('v2.sales.filters.kindMembership') }).click()
      await expect(cell).toHaveCount(0)

      await page.getByLabel(t('v2.sales.filters.kind'), { exact: true }).click()
      await page.getByRole('option', { name: t('v2.sales.filters.kindProduct') }).click()
      await expect(cell).toBeVisible()

      expect(consoleErrors).toEqual([])
    } finally {
      await deleteSaleByDescription(description)
    }
  })

  test('editar una venta cambia su medio de pago, y eliminarla la borra de verdad', async ({
    page,
  }) => {
    const description = uniqueDescription('Remera')
    const cell = page.getByRole('cell', {
      name: t('v2.sales.concept.product', { description }),
      exact: true,
    })

    try {
      await gotoV2(page, ROUTES_V2.V2_SALES)
      await openNewSaleMenu(page, 'withoutCustomer')
      await fillDetailAndContinue(page, { description, amount: 20000, method: t('payments.cash') })
      await confirmAndWaitClose(page, t('v2.sales.form.submit'), t('v2.sales.success.created'))

      // Editar.
      await cell.click()
      await expect(page.getByRole('heading', { name: t('v2.sales.form.editTitle') })).toBeVisible()
      await page.locator('#sale_payment_method').click()
      await page.getByRole('option', { name: t('payments.transfer'), exact: true }).click()
      await page.getByRole('button', { name: t('common.next'), exact: true }).click()
      await confirmAndWaitClose(page, t('v2.sales.form.submitEdit'), t('v2.sales.success.updated'))

      expect((await findSaleByDescription(description))?.payment_method).toBe(PAYMENT_TRANSFER)

      // Eliminar: pide confirmación, y se espera la respuesta del DELETE —no un
      // cambio de pantalla— por lo mismo que en el spec de Gastos.
      await cell.click()
      await page.getByRole('button', { name: t('v2.sales.form.delete'), exact: true }).click()
      await expect(page.getByText(t('v2.sales.delete.title'))).toBeVisible()

      const deleted = page.waitForResponse(
        (response) =>
          response.request().method() === 'DELETE' && response.url().includes('/api/sales/')
      )

      await page.getByRole('button', { name: t('common.confirm'), exact: true }).click()
      expect((await deleted).status()).toBe(200)
      expect(await findSaleByDescription(description)).toBeNull()
    } finally {
      await deleteSaleByDescription(description)
    }
  })

  test('las cuotas aparecen como sólo lectura; una venta a cliente queda atada a su ficha; Membresía abre la renovación', async ({
    page,
  }) => {
    test.setTimeout(90_000)

    // El alta cobra, así que deja una cuota de hoy en el período.
    const customer = await createCustomerViaUI(page, 'Venta')
    const name = fullName(customer)
    const description = uniqueDescription('Suplemento')

    try {
      await gotoV2(page, ROUTES_V2.V2_SALES)

      // 1. La cuota del alta está en Ventas, y su fila no abre nada.
      const membershipRow = page.getByRole('row').filter({ hasText: name })

      // El plan depende de la primera opción del alta; alcanza con el prefijo.
      await expect(membershipRow).toContainText(
        t('v2.sales.concept.membership', { plan: '' }).trim()
      )
      await expect(membershipRow.locator('td').last().locator('svg')).toHaveCount(0)
      await membershipRow.click()
      await expect(page.getByRole('dialog')).toHaveCount(0)

      // 2. Venta de producto a ese cliente.
      await openNewSaleMenu(page, 'withCustomer')
      await page
        .getByRole('searchbox', { name: t('v2.membership.renew.search.label') })
        .fill(customer.lastName)
      await page.getByRole('button', { name }).click()
      await page.locator('#sale_concept_product').click()

      // Con cliente no se piden "Datos de referencia": el nombre sale de la ficha.
      await expect(page.locator('#sale_buyer_name')).toHaveCount(0)

      await fillDetailAndContinue(page, { description, amount: 18000, method: t('payments.transfer') })
      await confirmAndWaitClose(page, t('v2.sales.form.submit'), t('v2.sales.success.created'))

      const stored = await findSaleByDescription(description)

      expect(stored?.customer_id, 'la venta no quedó atada al cliente').not.toBeNull()
      expect(stored?.buyer_name).toBeNull()

      // 3. "Membresía" no cobra acá: abre la renovación con el cliente resuelto.
      await openNewSaleMenu(page, 'withCustomer')
      await page
        .getByRole('searchbox', { name: t('v2.membership.renew.search.label') })
        .fill(customer.lastName)
      await page.getByRole('button', { name }).click()
      await page.locator('#sale_concept_membership').click()

      await expect(
        page.getByRole('heading', { name: t('v2.membership.renew.title') })
      ).toBeVisible()
    } finally {
      await deleteSaleByDescription(description)
    }
  })
})
