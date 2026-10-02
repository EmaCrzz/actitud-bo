import { test, expect, gotoV2 } from '../support/fixtures'
import { t } from '../support/i18n'
import { fullName } from '../support/data'
import { createCustomerViaUI } from '../support/flows'
import { ROUTES_V2 } from '@/consts/routes'

/**
 * Perfil del cliente desde la sección Clientes (Fase 6b).
 *
 * No tenía spec. Se suma el 2026-10-02 porque el panel pasó a abrirse también
 * desde el modal de asistencia del home, y su prop `customer` se achicó a id y
 * nombre: este es el chequeo de que la entrada original no se rompió.
 */
test.describe('v2 · perfil del cliente desde Clientes', () => {
  test('la fila abre el perfil y desde ahí se llega a renovar', async ({ page, consoleErrors }) => {
    const customer = await createCustomerViaUI(page, 'listado')

    // `?q=` filtra el listado al cliente de test: el apellido es único por corrida.
    await gotoV2(page, `${ROUTES_V2.V2_CUSTOMERS}?q=${encodeURIComponent(customer.lastName)}`)
    await page.getByText(fullName(customer)).first().click()

    await expect(page.getByRole('heading', { name: t('v2.customers.profile.title') })).toBeVisible()

    await page.getByRole('button', { name: t('v2.customers.profile.renew') }).click()

    await expect(page.getByRole('heading', { name: t('v2.membership.renew.title') })).toBeVisible()
    await expect(page.locator('#renew_membership_type')).toBeVisible({ timeout: 15_000 })

    expect(consoleErrors).toEqual([])
  })
})
