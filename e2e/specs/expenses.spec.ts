import type { Page } from '@playwright/test'
import { test, expect, gotoV2 } from '../support/fixtures'
import { t } from '../support/i18n'
import { E2E_PREFIX } from '../support/data'
import { deleteExpenseByDescription, findExpenseByDescription } from '../support/db'
import { toAppTzIsoDate, dateMismatchHint } from '../support/dates'
import { selectFirstOption } from '../support/flows'
import { ROUTES_V2 } from '@/consts/routes'
import { PAYMENT_CASH, PAYMENT_TRANSFER } from '@/membership/consts'

/**
 * Sección Gastos (fase 11).
 *
 * Qué cubre y por qué. La fase agrega `expenses.payment_method` y una pantalla
 * que crea, edita y borra gastos. Los modos de fallo que importan no se ven:
 *
 *  1. **La canonicalización de `expense_date`.** El datepicker manda
 *     "YYYY-MM-DD" y el server lo tiene que convertir a medianoche AR. Si
 *     viajara crudo, Postgres lo leería como medianoche UTC —21:00 del día
 *     anterior— y un gasto del día 1 caería en el mes contable anterior. La
 *     pantalla muestra la misma fecha en los dos casos. Se verifica contra la
 *     DB.
 *
 *  2. **Que el medio de pago llegue a la fila.** Los tres KPIs se derivan de
 *     esa columna: si el form no la mandara, el gasto sumaría al total y a
 *     ningún método, exactamente igual que un gasto histórico, y nadie lo
 *     notaría.
 *
 *  3. **Que el rango de fechas por default sea el mes AR en curso**, no el UTC.
 *
 * Los gastos que crea el spec llevan el prefijo `[E2E]` en la descripción y
 * los borra el teardown (`scripts/e2e-clean.sql`).
 */

/** Único por corrida: el spec busca el gasto por descripción exacta. */
function uniqueDescription(label: string): string {
  return `${E2E_PREFIX} ${label} ${Date.now()}`
}

interface NewExpense {
  description: string
  amount: number
  method: string
}

/** Completa y confirma el panel de alta. Deja el panel cerrándose solo. */
async function createExpenseViaUI(page: Page, expense: NewExpense): Promise<void> {
  await page
    .getByRole('button', { name: t('v2.expenses.new'), exact: true })
    .first()
    .click()
  await expect(page.getByRole('heading', { name: t('v2.expenses.form.createTitle') })).toBeVisible()

  await selectFirstOption(page, 'expense_category')
  await page.locator('#expense_description').fill(expense.description)
  await page.locator('#expense_amount').fill(String(expense.amount))

  await page.locator('#expense_payment_method').click()
  await page.getByRole('option', { name: expense.method, exact: true }).click()

  await page.getByRole('button', { name: t('common.confirm'), exact: true }).click()
  await expect(page.getByText(t('v2.expenses.success.created'))).toBeVisible()

  // Esperar a que el panel termine de cerrarse, no sólo a que aparezca el
  // cartel de éxito. El panel se cierra solo 1,2s después, y durante ese rato
  // el overlay del Sheet sigue capturando los clicks: la fila del listado ya
  // pasa el `toBeVisible` —Playwright mira CSS, no el overlay— pero el click
  // siguiente se lo come el overlay y el test muere por timeout sin decir por
  // qué. Pasó las dos primeras corridas.
  await expect(page.getByRole('heading', { name: t('v2.expenses.form.createTitle') })).toBeHidden()
}

/** Abre el panel de edición de un gasto desde su fila del listado. */
async function openExpenseRow(page: Page, description: string): Promise<void> {
  await page.getByRole('cell', { name: description, exact: true }).click()
  await expect(page.getByRole('heading', { name: t('v2.expenses.form.editTitle') })).toBeVisible()
}

test.describe('v2 · sección gastos', () => {
  test('la pantalla carga con sus tres KPIs y el rango del mes en curso', async ({
    page,
    consoleErrors,
  }) => {
    await gotoV2(page, ROUTES_V2.V2_EXPENSES)

    await expect(page.getByRole('heading', { name: t('v2.expenses.title') })).toBeVisible()

    await expect(page.getByText(t('v2.expenses.kpi.total'))).toBeVisible()
    await expect(page.getByText(t('v2.expenses.kpi.cash'))).toBeVisible()
    await expect(page.getByText(t('v2.expenses.kpi.transfer'))).toBeVisible()

    // El rango arranca en el día 1 del mes **AR**. Calculado en UTC desde el
    // server, el 1 a la medianoche AR cae en el mes anterior y el filtro
    // abriría en el mes equivocado. Se compara contra el día 1 formateado
    // como lo muestra el datepicker (dd/mm/yyyy).
    const firstOfMonth = `${toAppTzIsoDate(new Date()).slice(0, 8)}01`
    const [y, m, d] = firstOfMonth.split('-')

    await expect(page.locator('#expense_filter_from')).toContainText(`${d}/${m}/${y}`)

    expect(consoleErrors).toEqual([])
  })

  test('un gasto nuevo guarda su fecha canonicalizada y su medio de pago', async ({
    page,
    consoleErrors,
  }) => {
    const description = uniqueDescription('Gasto')

    try {
      await gotoV2(page, ROUTES_V2.V2_EXPENSES)
      await createExpenseViaUI(page, {
        description,
        amount: 12345,
        method: t('payments.cash'),
      })

      const stored = await findExpenseByDescription(description)

      expect(stored, 'el gasto no llegó a la DB').not.toBeNull()
      expect(stored?.amount).toBe(12345)

      // Lo que la pantalla no muestra: que el medio de pago se haya guardado
      // con la clave que leen los KPIs, y no como NULL.
      expect(stored?.payment_method).toBe(PAYMENT_CASH)

      // Y que la fecha sea el día AR que el form tenía cargado (hoy), no el
      // día UTC. Con el bug, un gasto creado después de las 21:00 AR se
      // guardaría con la fecha de mañana.
      const expectedDay = toAppTzIsoDate(new Date())
      const storedDay = toAppTzIsoDate(stored!.expense_date)

      expect(storedDay, dateMismatchHint('expense_date', expectedDay, stored!.expense_date)).toBe(
        expectedDay
      )

      expect(consoleErrors).toEqual([])
    } finally {
      await deleteExpenseByDescription(description)
    }
  })

  test('editar un gasto cambia su medio de pago en la DB', async ({ page }) => {
    const description = uniqueDescription('Editable')

    try {
      await gotoV2(page, ROUTES_V2.V2_EXPENSES)
      await createExpenseViaUI(page, {
        description,
        amount: 5000,
        method: t('payments.cash'),
      })

      await openExpenseRow(page, description)

      await page.locator('#expense_payment_method').click()
      await page.getByRole('option', { name: t('payments.transfer'), exact: true }).click()
      await page.getByRole('button', { name: t('common.confirm'), exact: true }).click()

      await expect(page.getByText(t('v2.expenses.success.updated'))).toBeVisible()

      const stored = await findExpenseByDescription(description)

      expect(stored?.payment_method).toBe(PAYMENT_TRANSFER)
    } finally {
      await deleteExpenseByDescription(description)
    }
  })

  test('eliminar un gasto pide confirmación y lo borra de verdad', async ({ page }) => {
    const description = uniqueDescription('Borrable')

    try {
      await gotoV2(page, ROUTES_V2.V2_EXPENSES)
      await createExpenseViaUI(page, {
        description,
        amount: 777,
        method: t('payments.cash'),
      })

      await openExpenseRow(page, description)

      await page.getByRole('button', { name: t('v2.expenses.form.delete'), exact: true }).click()

      // Sin la confirmación el borrado sería un click de distancia en una
      // pantalla de plata. El dialog es parte del contrato del flow.
      await expect(page.getByText(t('v2.expenses.delete.title'))).toBeVisible()

      // **Esperar la respuesta del DELETE, no un cambio de la pantalla.**
      //
      // Los dos intentos anteriores fueron falsos negativos por el mismo
      // motivo: Radix marca con `aria-hidden` todo lo que queda de fondo, y
      // `getByRole` respeta el árbol de accesibilidad. Con el panel abierto,
      // `toHaveCount(0)` sobre una celda da 0 al instante; y con el diálogo de
      // confirmación abierto, el propio heading del panel cuenta como oculto,
      // así que esperar a que "el panel cierre" también pasaba de inmediato.
      // En los dos casos la lectura contra la DB corría antes de que el
      // request terminara —tarda ~900ms— y encontraba la fila viva. **El
      // borrado nunca estuvo roto**: verificado aparte contra la ruta real.
      //
      // La respuesta HTTP es la única señal que significa lo que el test
      // necesita saber.
      const deleted = page.waitForResponse(
        (response) =>
          response.request().method() === 'DELETE' &&
          response.url().includes('/api/accounting/expenses/')
      )

      await page.getByRole('button', { name: t('common.confirm'), exact: true }).click()
      expect((await deleted).status()).toBe(200)

      expect(await findExpenseByDescription(description)).toBeNull()

      // La fila se busca con un locator de CSS y no con `getByRole`, por lo
      // mismo de arriba: un rol no encontrado puede significar "no está" o
      // "está detrás de un modal".
      await expect(page.locator('td', { hasText: description })).toHaveCount(0)
    } finally {
      await deleteExpenseByDescription(description)
    }
  })

  test('el filtro por método acota el listado', async ({ page }) => {
    const description = uniqueDescription('Transferido')

    try {
      await gotoV2(page, ROUTES_V2.V2_EXPENSES)
      await createExpenseViaUI(page, {
        description,
        amount: 9100,
        method: t('payments.transfer'),
      })

      await expect(page.getByRole('cell', { name: description, exact: true })).toBeVisible()

      // Filtrar por Efectivo tiene que dejarlo afuera. Sin este assert, un
      // filtro que no filtra pasaría desapercibido: la lista sigue mostrando
      // filas plausibles.
      await page.getByLabel(t('v2.expenses.filters.method'), { exact: true }).click()
      await page.getByRole('option', { name: t('payments.cash'), exact: true }).click()

      await expect(page.getByRole('cell', { name: description, exact: true })).toHaveCount(0)

      // Y filtrar por Transferencia tiene que volver a incluirlo — el assert
      // negativo solo también pasaría si el filtro vaciara la tabla siempre.
      await page.getByLabel(t('v2.expenses.filters.method'), { exact: true }).click()
      await page.getByRole('option', { name: t('payments.transfer'), exact: true }).click()

      await expect(page.getByRole('cell', { name: description, exact: true })).toBeVisible()
    } finally {
      await deleteExpenseByDescription(description)
    }
  })
  test('el chevron del final de la fila abre el panel, igual que el resto de la fila', async ({
    page,
  }) => {
    const description = uniqueDescription('Chevron')

    try {
      await gotoV2(page, ROUTES_V2.V2_EXPENSES)
      await createExpenseViaUI(page, {
        description,
        amount: 3300,
        method: t('payments.cash'),
      })

      // El chevron vive en la última celda de la fila. Era el **único** punto
      // de la fila que no abría el panel: se pasaba como `rowActions`, cuya
      // celda frena la propagación para que un menú no dispare el click de la
      // fila. Justo la parte que más invita a hacer click. Lo reportó Ema.
      const row = page.getByRole('row').filter({ hasText: description })

      await row.locator('td').last().click()

      await expect(
        page.getByRole('heading', { name: t('v2.expenses.form.editTitle') })
      ).toBeVisible()
    } finally {
      await deleteExpenseByDescription(description)
    }
  })

  test('filtrar por método no mueve los KPIs, que describen el período', async ({ page }) => {
    await gotoV2(page, ROUTES_V2.V2_EXPENSES)

    const totalKpi = page.locator('dt', { hasText: t('v2.expenses.kpi.total') }).locator('+ dd')
    const before = await totalKpi.textContent()

    await page.getByLabel(t('v2.expenses.filters.method'), { exact: true }).click()
    await page.getByRole('option', { name: t('payments.cash'), exact: true }).click()

    // El filtro acota la tabla, no el período. Antes "Total de gastos" pasaba
    // a mostrar el total en efectivo —el mismo número que el KPI de al lado—
    // y afirmaba que en el mes se había gastado eso. Lo reportó Ema.
    await expect(totalKpi).toHaveText(before ?? '')
  })
})
