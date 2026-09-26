import { test, expect, gotoV2, sidebarLink } from '../support/fixtures'
import { t } from '../support/i18n'
import { ROUTES_V2 } from '@/consts/routes'

/**
 * Smoke de las pantallas v2.
 *
 * Es el spec más barato de la suite y el que más regresiones atrapa: todas las
 * páginas v2 son server components que resuelven RPCs contra Supabase, así que
 * una migración que renombra una columna, un RPC que cambia de firma o una key
 * de i18n borrada se manifiestan acá como error boundary o error de consola,
 * sin que haya que ejercitar ningún flujo.
 *
 * No escribe nada en la DB — se puede correr tantas veces como se quiera.
 */
const SCREENS = [
  ROUTES_V2.V2_HOME,
  ROUTES_V2.V2_CUSTOMERS,
  ROUTES_V2.V2_ATTENDANCE,
  ROUTES_V2.V2_MEMBERSHIPS,
  ROUTES_V2.V2_SALES,
  ROUTES_V2.V2_EXPENSES,
  ROUTES_V2.V2_BALANCE,
] as const

test.describe('v2 · navegación', () => {
  for (const route of SCREENS) {
    test(`${route} carga sin errores`, async ({ page, consoleErrors }) => {
      await gotoV2(page, route)

      // Que la URL no haya cambiado descarta el modo de fallo más silencioso:
      // el layout v2 redirige a HOME cuando falta `v2_access`, y sin este
      // assert el test pasaría verificando la pantalla equivocada.
      expect(page.url()).toContain(route)

      // El sidebar sólo se monta dentro del AppShell de v2: si está, el layout
      // resolvió y la página no cayó en un error boundary.
      await expect(sidebarLink(page, t('v2.sidebar.menu.home'))).toBeVisible()

      expect(consoleErrors, `errores de consola en ${route}`).toEqual([])
    })
  }

  test('el sidebar navega entre secciones', async ({ page, consoleErrors }) => {
    await gotoV2(page, ROUTES_V2.V2_HOME)

    await sidebarLink(page, t('v2.sidebar.menu.customers')).click()
    await page.waitForURL(`**${ROUTES_V2.V2_CUSTOMERS}`)
    await expect(page.getByText(t('v2.customers.subtitle'))).toBeVisible()

    await sidebarLink(page, t('v2.sidebar.menu.home')).click()
    await page.waitForURL(`**${ROUTES_V2.V2_HOME}`)
    await expect(page.getByText(t('v2.home.quickActions.title'))).toBeVisible()

    expect(consoleErrors).toEqual([])
  })
})
