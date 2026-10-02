import type { Page } from '@playwright/test'
import { test, expect, gotoV2 } from '../support/fixtures'
import { t } from '../support/i18n'
import { E2E_PREFIX, fullName, type TestCustomer } from '../support/data'
import { createCustomerViaUI, selectFirstOption } from '../support/flows'
import { createDiscountRuleInDb, findLatestPaymentByPersonId } from '../support/db'
import { ROUTES_V2 } from '@/consts/routes'

/**
 * Promociones en la renovación de v2 (2026-10-02, ADR 20261002120000).
 *
 * El grupo familiar dejó de ser una sugerencia por cliente y pasó a ser una
 * promoción que quien cobra elige del catálogo. Lo que la pantalla no muestra
 * es lo que importa: que el pago quede con **la regla** de la promo, porque el
 * desglose de descuentos del Balance agrupa por `discount_rule_id`. Un pago con
 * el monto correcto y sin regla se ve idéntico en el comprobante y desaparece
 * del concepto en el Balance — por eso se verifica contra la DB.
 *
 * La promo se crea por DB porque la pantalla que las da de alta es de la Fase
 * 14. Lleva `[E2E]` y un sufijo único (el nombre es UNIQUE), y la borra el
 * teardown después de los pagos que la referencian.
 */

const PROMOTION_VALUE = 1500

async function openRenewalFor(page: Page, customer: TestCustomer): Promise<void> {
  await gotoV2(page, ROUTES_V2.V2_HOME)
  await page.getByRole('button', { name: t('v2.home.quickActions.registerPayment') }).click()
  await expect(page.getByRole('heading', { name: t('v2.membership.renew.title') })).toBeVisible()

  await page.getByPlaceholder(t('v2.membership.renew.search.placeholder')).fill(customer.lastName)
  await page.getByText(fullName(customer)).first().click()

  await expect(page.locator('#renew_membership_type')).toBeVisible({ timeout: 15_000 })
}

test.describe('v2 · promociones al renovar', () => {
  test('la promoción elegida queda registrada con su regla, su monto y su nota', async ({
    page,
  }) => {
    const promotionName = `${E2E_PREFIX} Promo ${Date.now()}`
    const ruleId = await createDiscountRuleInDb({ name: promotionName, value: PROMOTION_VALUE })
    const customer = await createCustomerViaUI(page, 'promo')

    await openRenewalFor(page, customer)
    await selectFirstOption(page, 'renew_payment_type')

    // Arranca sin promoción: el default es justamente lo que cambió.
    await expect(page.locator('#renew_promotion')).toHaveText(t('v2.membership.renew.noPromotion'))

    await page.locator('#renew_promotion').click()
    await page.getByRole('option', { name: promotionName }).click()
    await page.locator('#renew_promotion_note').fill('[E2E] paga junto con otro')

    // Excluyentes: con una promo elegida, el descuento manual no se puede sumar.
    await expect(page.locator('#renew_discount')).toBeDisabled()

    await page.getByRole('button', { name: t('common.next') }).click()
    await expect(
      page.getByText(t('v2.membership.renew.summary.title'), { exact: true })
    ).toBeVisible()
    await expect(page.getByText(promotionName).first()).toBeVisible()

    await page.getByRole('button', { name: t('v2.membership.renew.submit') }).click()
    await expect(page.getByText(t('v2.membership.renew.success.title'))).toBeVisible({
      timeout: 20_000,
    })

    const payment = await findLatestPaymentByPersonId(customer.personId)

    expect(payment, 'la renovación tiene que haber registrado un pago').not.toBeNull()
    expect(payment!.discount_rule_id).toBe(ruleId)
    expect(payment!.discount_amount).toBe(PROMOTION_VALUE)
    expect(payment!.discount_note).toBe('[E2E] paga junto con otro')
  })

  test('un descuento manual bloquea la promoción', async ({ page }) => {
    const customer = await createCustomerViaUI(page, 'manual')

    await openRenewalFor(page, customer)

    await page.locator('#renew_discount').click()
    await page.getByRole('option', { name: t('v2.membership.renew.otherAmount') }).click()

    await expect(page.locator('#renew_promotion')).toBeDisabled()
  })
})
