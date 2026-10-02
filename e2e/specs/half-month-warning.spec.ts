import type { Page } from '@playwright/test'
import { test, expect, gotoV2 } from '../support/fixtures'
import { t } from '../support/i18n'
import { buildTestCustomer, fullName } from '../support/data'
import { createCustomerViaUI, selectFirstOption } from '../support/flows'
import { ACTITUD_BILLING_POLICY } from '@/accounting/billing-policy'
import { ROUTES_V2 } from '@/consts/routes'
import type { TranslationKey } from '@/lib/i18n/types'
import { getAppTzDateParts } from '@/lib/timezone'

/**
 * Aviso de medio mes fuera de la política (2026-10-02).
 *
 * La regla —cuándo avisar— la fijan los unit tests de `isHalfMonthOutsidePolicy`.
 * Esto verifica que **las dos pantallas que dejan elegir medio mes la usen**: la
 * renovación y el alta. El aviso informa, no bloquea, así que lo que se mira es
 * que aparezca y que desaparezca al volver a mes completo.
 */

async function chooseChargeMode(
  page: Page,
  triggerId: string,
  labelKey: TranslationKey
): Promise<void> {
  await page.locator(`#${triggerId}`).click()
  await page.getByRole('option', { name: t(labelKey) }).click()
}

test.describe('v2 · aviso de medio mes', () => {
  test('al renovar, medio mes con inicio en la primera mitad avisa', async ({ page }) => {
    // El alta deja la membresía hasta fin de mes, así que la renovación propone
    // arrancar el 1 del mes siguiente: siempre antes del umbral, el día que se
    // corra el test.
    const customer = await createCustomerViaUI(page, 'medio-mes')

    await gotoV2(page, ROUTES_V2.V2_HOME)
    await page.getByRole('button', { name: t('v2.home.quickActions.registerPayment') }).click()
    await page.getByPlaceholder(t('v2.membership.renew.search.placeholder')).fill(customer.lastName)
    await page.getByText(fullName(customer)).first().click()
    await expect(page.locator('#renew_period_mode')).toBeVisible({ timeout: 15_000 })

    await expect(page.locator('#half_month_warning')).toHaveCount(0)

    await chooseChargeMode(page, 'renew_period_mode', 'membership.chargeModeHalf')
    await expect(page.locator('#half_month_warning')).toBeVisible()

    // Informa, no bloquea: se puede seguir al resumen.
    await page.getByRole('button', { name: t('common.next') }).click()
    await expect(
      page.getByText(t('v2.membership.renew.summary.title'), { exact: true })
    ).toBeVisible()

    await page.getByRole('button', { name: t('common.back') }).click()
    await chooseChargeMode(page, 'renew_period_mode', 'membership.chargeModeFull')
    await expect(page.locator('#half_month_warning')).toHaveCount(0)
  })

  test('en el alta, el aviso depende del día en que arranca el período', async ({ page }) => {
    // El alta arranca hoy, así que el resultado depende del día en que corre
    // el test. Se calcula con la misma política para que valga cualquier día.
    const today = getAppTzDateParts(new Date()).day
    const shouldWarn = today < ACTITUD_BILLING_POLICY.halfMonthStart
    const customer = buildTestCustomer('alta-medio-mes')

    await gotoV2(page, ROUTES_V2.V2_CUSTOMERS)
    await page.getByRole('button', { name: t('v2.customers.newCustomer') }).click()
    await page.locator('#first_name').fill(customer.firstName)
    await page.locator('#last_name').fill(customer.lastName)
    await page.locator('#person_id').fill(customer.personId)
    await page.locator('#phone').fill(customer.phone)
    await page.getByRole('button', { name: t('common.next') }).click()

    await selectFirstOption(page, 'membership_type')
    await chooseChargeMode(page, 'charge_mode', 'membership.chargeModeHalf')

    await expect(page.locator('#half_month_warning')).toHaveCount(shouldWarn ? 1 : 0)
  })
})
