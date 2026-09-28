import { test, expect } from '../support/fixtures'
import { ROUTES_V2 } from '@/consts/routes'

/**
 * El único spec de la suite que corre sin sesión: descarta el storageState del
 * setup para ejercitar el middleware.
 */
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('v2 · guard de autenticación', () => {
  test('una ruta v2 sin sesión redirige al login', async ({ page }) => {
    await page.goto(ROUTES_V2.V2_HOME)
    await page.waitForURL('**/auth/login')

    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('el home sin sesión redirige al login', async ({ page }) => {
    await page.goto('/')
    await page.waitForURL('**/auth/login')

    await expect(page).toHaveURL(/\/auth\/login/)
  })
})
