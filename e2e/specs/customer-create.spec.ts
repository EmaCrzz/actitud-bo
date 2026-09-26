import { test, expect, gotoV2 } from '../support/fixtures'
import { t } from '../support/i18n'
import { fullName } from '../support/data'
import { createCustomerViaUI } from '../support/flows'
import { ROUTES_V2 } from '@/consts/routes'

/**
 * Alta de cliente desde la sección Clientes.
 *
 * ESTE SPEC ESCRIBE EN LA DB DE DEV, Y ESCRIBE MÁS DE LO QUE PARECE: en v2
 * toda alta cobra (ver el docblock de `CustomerFormPanel`), así que cada
 * corrida crea cliente + membresía + un pago que entra en la contabilidad del
 * mes. Por eso el cliente lleva prefijo `[E2E]` y por eso existe
 * `npm run test:e2e:clean`.
 */
test.describe('v2 · alta de cliente', () => {
  test('crea un cliente y lo muestra en el listado', async ({ page, consoleErrors }) => {
    const customer = await createCustomerViaUI(page, 'alta')

    // El panel se autocierra tras el mensaje de éxito; buscarlo en el listado
    // confirma que el registro se persistió de verdad y que la búsqueda lo
    // encuentra — no sólo que el panel dijo "listo".
    await gotoV2(page, ROUTES_V2.V2_CUSTOMERS)
    await page.getByPlaceholder(t('v2.customers.searchPlaceholder')).fill(customer.lastName)

    // `.first()`: el listado se renderiza dos veces en el DOM —la tabla de
    // desktop y las cards de mobile—, y el switch entre ambas es por CSS. Que
    // el nombre aparezca una vez ya prueba lo que este test verifica.
    await expect(page.getByText(fullName(customer)).first()).toBeVisible({ timeout: 15_000 })

    expect(consoleErrors).toEqual([])
  })

  test('no avanza de paso con los campos requeridos vacíos', async ({ page }) => {
    await gotoV2(page, ROUTES_V2.V2_CUSTOMERS)
    await page.getByRole('button', { name: t('v2.customers.newCustomer') }).click()
    await expect(page.getByRole('heading', { name: t('v2.customers.form.title') })).toBeVisible()

    // Avanzar en blanco tiene que quedarse en el paso 1. No se verifica el texto
    // del error: los mensajes de `basicCustomerValidation` están hardcodeados en
    // español y fuera del diccionario, así que asertar sobre ellos duplicaría
    // ese string. Lo que importa es que no deje avanzar.
    await page.getByRole('button', { name: t('common.next') }).click()

    await expect(page.locator('#first_name')).toBeVisible()
    await expect(page.getByRole('button', { name: t('common.next') })).toBeVisible()
  })
})
