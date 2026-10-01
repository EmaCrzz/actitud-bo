import type { Page } from '@playwright/test'
import { test, expect, gotoV2 } from '../support/fixtures'
import { t } from '../support/i18n'
import { toAppTzIsoDate } from '../support/dates'
import { ROUTES_V2 } from '@/consts/routes'
import { getCurrentMonthKeyInAppTz, monthKeyToIsoRange, shiftMonthKey } from '@/lib/month-key'
import { formatMonthKey } from '@/lib/format-date'

/**
 * Balance (fase 13).
 *
 * El modo de fallo que importa no se ve mirando la pantalla sola: que el
 * Balance diga un número y las secciones de cada lado digan otro. La fase lo
 * evita por construcción —lee las mismas filas que Ventas y Gastos—, y este
 * spec lo verifica de punta a punta: **los Ingresos de Balance son el "Total
 * cobrado" de Ventas, y los Egresos el "Total de gastos" de Gastos**, para el
 * mismo mes. Si alguien cambia cómo una de las tres interpreta el rango, el
 * test se pone rojo aunque las tres pantallas se vean bien por separado.
 *
 * No escribe nada en la DB.
 */

/** El texto del valor de un KPI de Ventas o Gastos (`<dt>` + `<dd>`). */
async function kpiValue(page: Page, label: string): Promise<string> {
  const value = await page.locator('dt', { hasText: label }).locator('+ dd').textContent()

  return (value ?? '').trim()
}

test.describe('v2 · balance', () => {
  test('carga en el mes AR en curso, y no deja ir al futuro', async ({ page, consoleErrors }) => {
    await gotoV2(page, ROUTES_V2.V2_BALANCE)

    await expect(page.getByRole('heading', { name: t('v2.balance.title'), level: 2 })).toBeVisible()

    // El mes en curso **AR**: calculado en UTC desde el server, el día 1 a la
    // medianoche AR abriría en el mes anterior.
    const current = toAppTzIsoDate(new Date()).slice(0, 7)

    expect(current).toBe(getCurrentMonthKeyInAppTz())
    await expect(page.locator('#balance_month_label')).toHaveText(formatMonthKey(current))
    await expect(page.locator('#balance_month_next')).toBeDisabled()

    expect(consoleErrors).toEqual([])
  })

  test('el navegador cambia de mes por la URL, y volver al actual la limpia', async ({ page }) => {
    await gotoV2(page, ROUTES_V2.V2_BALANCE)

    const previous = shiftMonthKey(getCurrentMonthKeyInAppTz(), -1)

    await page.locator('#balance_month_previous').click()
    await page.waitForURL(`**month=${previous}`)
    await expect(page.locator('#balance_month_label')).toHaveText(formatMonthKey(previous))

    // Al mes en curso se vuelve a la ruta **sin** `?month=`: una sola URL por vista.
    await page.locator('#balance_month_next').click()
    await page.waitForURL((url) => !url.search.includes('month='))
    await expect(page.locator('#balance_month_next')).toBeDisabled()
  })

  test('Ingresos y Egresos cuadran con Ventas y con Gastos para el mismo mes', async ({ page }) => {
    // El mes anterior: es un mes cerrado, así que los números no se mueven
    // mientras corre el test (los specs de Ventas y Gastos crean filas de hoy).
    const month = shiftMonthKey(getCurrentMonthKeyInAppTz(), -1)
    const { from, to } = monthKeyToIsoRange(month)

    await gotoV2(page, `${ROUTES_V2.V2_BALANCE}?month=${month}`)
    const income = (await page.locator('#balance_income').textContent())?.trim()
    const expenses = (await page.locator('#balance_expenses').textContent())?.trim()

    await gotoV2(page, `${ROUTES_V2.V2_SALES}?from=${from}&to=${to}`)
    expect(income, 'Ingresos de Balance ≠ Total cobrado de Ventas').toBe(
      await kpiValue(page, t('v2.sales.kpi.total'))
    )

    await gotoV2(page, `${ROUTES_V2.V2_EXPENSES}?from=${from}&to=${to}`)
    expect(expenses, 'Egresos de Balance ≠ Total de gastos de Gastos').toBe(
      await kpiValue(page, t('v2.expenses.kpi.total'))
    )
  })

  test('Evolución tiene vista de tabla con los seis meses', async ({ page }) => {
    await gotoV2(page, ROUTES_V2.V2_BALANCE)

    // La tabla es la forma de leer todos los valores sin depender del hover.
    // A 1280 —el viewport de la suite y el ancho de laptop más común— tiene que
    // ser la tabla de cuatro columnas, no la lista angosta: es el ancho donde
    // Ema la extrañaba.
    await page.locator('#balance_evolution_toggle').click()

    const table = page.getByRole('table', { name: t('v2.balance.evolution.tableCaption') })

    await expect(table).toBeVisible()
    await expect(table.locator('tbody tr')).toHaveCount(6)
  })

  test('un mes inválido o futuro en la URL cae al mes en curso', async ({ page, consoleErrors }) => {
    const current = getCurrentMonthKeyInAppTz()

    for (const bad of ['2026-13', 'septiembre', shiftMonthKey(current, 3)]) {
      await gotoV2(page, `${ROUTES_V2.V2_BALANCE}?month=${bad}`)
      await expect(page.locator('#balance_month_label')).toHaveText(formatMonthKey(current))
    }

    expect(consoleErrors).toEqual([])
  })
})
