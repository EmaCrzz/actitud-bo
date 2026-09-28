import { test, expect } from '../support/fixtures'
import { t } from '../support/i18n'
import { E2E_PREFIX } from '../support/data'
import { createMembershipPlanInDb, deleteMembershipPlanInDb } from '../support/db'
import { ACCOUNTING_TAB_MEMBERSHIP, ROUTES, STATS } from '@/consts/routes'
import { membershipTypeKeyFromName } from '@/membership/catalog'

/**
 * Smoke de **v1**, que hasta ahora no tenía ninguno.
 *
 * Existe por lo que hizo la Fase 10: para que los planes se puedan crear desde
 * la UI hubo que migrar ~20 call sites que etiquetan una membresía, y **la
 * mitad son pantallas de v1**. La regla operativa #1 del plan dice que todo
 * cambio de v2 tiene que dejar v1 funcionando, y hasta acá eso se verificaba
 * sólo a ojo.
 *
 * Cubre dos cosas distintas:
 *
 * 1. **Que las pantallas carguen sin errores de consola.** Barato y suficiente
 *    para detectar el modo de fallo que esta fase introdujo: `t(undefined)`
 *    tira un error boundary que se lleva la pantalla entera.
 *
 * 2. **Que un plan fuera del catálogo no las rompa.** Es el caso nuevo. Antes
 *    de esta fase `membership_type` sólo podía ser uno de 5 valores conocidos,
 *    y todo el código de v1 asume eso. El plan de prueba se inserta y se borra
 *    contra la DB en vez de por la UI: v1 no tiene pantalla para crearlo, y el
 *    punto es justamente que v1 se lo encuentre sin haberlo pedido.
 *
 * No verifica reglas de negocio de v1 — para eso están los unit tests y QA
 * humano. Verifica que v1 **siga en pie** después de que v2 le mueva algo.
 */

const V1_SCREENS = [
  { route: ROUTES.HOME, label: 'home' },
  { route: ROUTES.CUSTOMER, label: 'clientes' },
  { route: ROUTES.ASSISTANCES, label: 'asistencias' },
  { route: ROUTES.EXPENSES, label: 'gastos' },
  { route: ROUTES.STATS, label: 'stats' },
  { route: ROUTES.INCOMES, label: 'incomes' },
] as const

test.describe('v1 · smoke de regresión', () => {
  for (const { route, label } of V1_SCREENS) {
    test(`${label} (${route}) carga sin errores`, async ({ page, consoleErrors }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')

      // La URL no cambió: descarta que el middleware haya mandado a /login,
      // que dejaría la pantalla "cargando bien" por el motivo equivocado.
      expect(page.url()).toContain(route === '/' ? '' : route)
      await expect(page.locator('body')).toBeVisible()

      expect(consoleErrors).toEqual([])
    })
  }

  test('un plan fuera del catálogo no rompe las pantallas de v1', async ({
    page,
    consoleErrors,
  }) => {
    const name = `${E2E_PREFIX} Plan v1 ${Date.now()}`
    const type = membershipTypeKeyFromName(name)

    await createMembershipPlanInDb({ type, name, amount: 13000, weeklyQuota: 3 })

    try {
      // `/stats/accounting` es donde vive `MembershipAmounts`, la tabla de
      // precios que lista los tipos leyendo la DB — la pantalla de v1 que se
      // encuentra el plan nuevo sin intermediarios. Antes de los resolvers,
      // `t(MembershipTranslation[type])` acá devolvía `undefined` y tiraba la
      // pantalla entera.
      // `?tab=membership` y no un click: el tab se deriva del search param y
      // entrar directo es lo que hace el link de la app. Con el tab por
      // defecto (Contaduría) la tabla de precios ni se monta, y el test daría
      // verde sin haber mirado nada.
      await page.goto(`${STATS}/accounting?tab=${ACCOUNTING_TAB_MEMBERSHIP}`)
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('tab', { name: t('membership.title') })).toHaveAttribute(
        'data-state',
        'active'
      )

      // La clave humanizada, que es lo que v1 puede mostrar sin joinear el
      // nombre. No es el nombre exacto —se pierden los acentos— y el test lo
      // fija así a propósito: si algún día se pasa el `name` real por estas
      // queries, este assert es el que avisa que cambió.
      await expect(page.getByText('Plan v1', { exact: false }).first()).toBeVisible()

      // Y los del catálogo siguen traducidos: sin esto, un resolver que
      // devolviera siempre la clave humanizada pasaría el assert de arriba.
      await expect(page.getByText(t('membership.types.5_days')).first()).toBeVisible()

      expect(consoleErrors).toEqual([])
    } finally {
      await deleteMembershipPlanInDb(type)
    }
  })
})
