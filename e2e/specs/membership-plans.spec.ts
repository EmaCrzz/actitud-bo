import type { Page } from '@playwright/test'
import { test, expect, gotoV2, sidebarLink } from '../support/fixtures'
import { t } from '../support/i18n'
import { E2E_PREFIX, buildTestCustomer } from '../support/data'
import { findMembershipTypeByName } from '../support/db'
import { ROUTES_V2 } from '@/consts/routes'
import { membershipTypeKeyFromName } from '@/membership/catalog'

/**
 * Sección Configuraciones → Membresías (fase 10).
 *
 * Qué cubre y por qué. La fase abrió el catálogo de planes: hasta ahora los 5
 * tipos vivían hardcodeados con comportamiento especial atado a la clave
 * literal, y desde acá se crean planes nuevos desde un formulario. Los dos
 * modos de fallo que eso introduce no se ven en pantalla:
 *
 *  1. **La clave derivada del nombre.** El form pide "Plan familiar 5 días" y
 *     la DB guarda `PLAN_FAMILIAR_5_DIAS`, que es lo que referencian las FKs
 *     de `customer_membership` y `membership_payments`. Si la derivación
 *     cambiara, la pantalla se vería igual y el plan quedaría con una clave
 *     distinta de la que el resto del sistema espera.
 *
 *  2. **El cupo semanal.** Pasó de un mapa hardcodeado a una columna. Un plan
 *     que se guarda sin `weekly_quota` renderiza cero casilleros de asistencia
 *     sin ningún error — el fallo silencioso que motivó los resolvers.
 *
 * Los dos se verifican **contra la DB**, no contra el DOM.
 *
 * Los planes que crea el spec llevan el prefijo `[E2E]` y los borra el
 * teardown (`scripts/e2e-clean.sql`), que los procesa al final por la FK
 * RESTRICT.
 */

/** Único por corrida: el `type` derivado tiene UNIQUE y dos corridas chocarían. */
function uniquePlanName(): string {
  return `${E2E_PREFIX} Plan ${Date.now()}`
}

/**
 * Abre el alta de cliente y avanza hasta el paso 2, que es donde vive el select
 * de membresía.
 *
 * Existe porque sin el avance los asserts sobre el select son **falsos
 * positivos**: `#membership_type` no está montado en el paso 1, así que
 * "el plan no aparece" da verdadero por el motivo equivocado. No reusa
 * `createCustomerViaUI` porque ese completa el alta y crea un cliente, y acá
 * sólo hace falta ver las opciones.
 */
async function openNewCustomerMembershipStep(page: Page): Promise<void> {
  const customer = buildTestCustomer('catalogo')

  await page.getByRole('button', { name: t('v2.customers.newCustomer') }).first().click()
  await expect(page.getByRole('heading', { name: t('v2.customers.form.title') })).toBeVisible()

  await page.locator('#first_name').fill(customer.firstName)
  await page.locator('#last_name').fill(customer.lastName)
  await page.locator('#person_id').fill(customer.personId)
  await page.locator('#phone').fill(customer.phone)

  await page.getByRole('button', { name: t('common.next') }).click()
  await expect(page.getByText(t('v2.customers.form.stepMembership'))).toBeVisible()
}

test.describe('v2 · sección membresías', () => {
  test('lista los planes con su estado, e incluye el VIP sin precio', async ({
    page,
    consoleErrors,
  }) => {
    await gotoV2(page, ROUTES_V2.V2_SETTINGS_MEMBERSHIPS)

    await expect(
      page.getByRole('heading', { name: t('v2.membership.plans.title') })
    ).toBeVisible()

    // El VIP está cargado con `amount = 0`, no con NULL. Comparar contra NULL
    // para decidir "Sin costo" le ponía "$ 0", que es lo que este assert fija.
    await expect(page.getByText(t('v2.membership.plans.free')).first()).toBeVisible()

    // Al menos un plan activo: si el badge dejara de renderizarse, la columna
    // Estado quedaría vacía sin romper nada.
    await expect(
      page.getByText(t('v2.membership.plans.status.active')).first()
    ).toBeVisible()

    expect(consoleErrors).toEqual([])
  })

  test('crea un plan y la DB guarda la clave derivada y el cupo', async ({
    page,
    consoleErrors,
  }) => {
    const name = uniquePlanName()

    await gotoV2(page, ROUTES_V2.V2_SETTINGS_MEMBERSHIPS)

    await page.getByRole('button', { name: t('v2.membership.plans.new') }).first().click()

    await page.locator('#plan_name').fill(name)
    await page.locator('#plan_amount').fill('15000')
    await page.locator('#plan_middle_amount').fill('8000')
    await page.locator('#plan_surcharge').fill('17000')

    // `id` estable y no `getByLabel`: "Frecuencia de días" es corto y reaparece
    // como encabezado de columna, y getByLabel matchea por substring.
    await page.locator('#plan_weekly_quota').click()
    await page.getByRole('option', { name: '3', exact: true }).click()

    await page.getByRole('button', { name: t('v2.membership.plans.create.submit') }).click()

    await expect(page.getByText(t('v2.membership.plans.create.success'))).toBeVisible({
      timeout: 15_000,
    })

    const stored = await findMembershipTypeByName(name)

    expect(stored, `No se encontró en types_memberships el plan "${name}"`).not.toBeNull()

    // Lo que la pantalla no muestra y el resto del sistema sí usa.
    expect(stored?.type).toBe(membershipTypeKeyFromName(name))
    expect(stored?.weekly_quota).toBe(3)
    expect(stored?.active).toBe(true)
    expect(stored?.amount).toBe(15000)
    expect(stored?.middle_amount).toBe(8000)
    expect(stored?.amount_surcharge).toBe(17000)

    expect(consoleErrors).toEqual([])
  })

  test('un plan discontinuado desaparece del alta pero sigue en el listado', async ({
    page,
  }) => {
    const name = uniquePlanName()

    await gotoV2(page, ROUTES_V2.V2_SETTINGS_MEMBERSHIPS)

    await page.getByRole('button', { name: t('v2.membership.plans.new') }).first().click()
    await page.locator('#plan_name').fill(name)
    await page.locator('#plan_amount').fill('9000')
    await page.locator('#plan_weekly_quota').click()
    await page.getByRole('option', { name: '2', exact: true }).click()
    await page.getByRole('button', { name: t('v2.membership.plans.create.submit') }).click()
    await expect(page.getByText(t('v2.membership.plans.create.success'))).toBeVisible({
      timeout: 15_000,
    })

    // Editarlo y apagarlo.
    await page.getByRole('cell', { name, exact: true }).click()
    await page.locator('#plan_active').click()
    await page.getByRole('button', { name: t('v2.membership.plans.edit.submit') }).click()
    await expect(page.getByText(t('v2.membership.plans.edit.success'))).toBeVisible({
      timeout: 15_000,
    })

    expect((await findMembershipTypeByName(name))?.active).toBe(false)

    // Sigue listado acá: la sección es la única pantalla que muestra los
    // inactivos, porque es donde se los reactiva.
    await gotoV2(page, ROUTES_V2.V2_SETTINGS_MEMBERSHIPS)
    await expect(page.getByRole('cell', { name, exact: true })).toBeVisible()

    // Pero el alta ya no lo ofrece. Es el punto de la funcionalidad: un plan
    // discontinuado no se puede vender más.
    await gotoV2(page, ROUTES_V2.V2_CUSTOMERS)
    await openNewCustomerMembershipStep(page)
    await page.locator('#membership_type').click()
    await expect(page.getByRole('option', { name, exact: true })).toHaveCount(0)
    // Un plan del catálogo sí sigue ahí: sin esto, un select vacío por
    // cualquier otro motivo haría pasar el test.
    await expect(
      page.getByRole('option', { name: t('membership.typesWeekly.5_days'), exact: true })
    ).toBeVisible()
  })

  test('un plan recién creado aparece en el alta sin recargar la página', async ({ page }) => {
    const name = uniquePlanName()

    // ------------------------------------------------------------------
    // 1. Calentar la caché ANTES de crear el plan.
    // ------------------------------------------------------------------
    // Este paso es el test. El catálogo se lee con React Query y 5 minutos de
    // `staleTime`: el bug es que la entrada cacheada **no se invalida** al
    // crear un plan, así que sólo se manifiesta si ya existía. Sin abrir el
    // alta acá, el primer fetch ocurre después de la creación y trae el plan
    // igual — el test pasaría con y sin el arreglo, que es exactamente lo que
    // pasó en la primera versión de este spec.
    await gotoV2(page, ROUTES_V2.V2_CUSTOMERS)
    await openNewCustomerMembershipStep(page)
    await page.keyboard.press('Escape')

    // ------------------------------------------------------------------
    // 2. Crear el plan, navegando por dentro de la app.
    // ------------------------------------------------------------------
    // Por el sidebar y no con `gotoV2`: `page.goto()` es un load completo que
    // tira la caché, y con eso el bug tampoco se ve. El operador navega
    // client-side, donde la caché sobrevive entre pantallas.
    await page.getByRole('button', { name: t('v2.sidebar.menu.settings') }).click()
    await sidebarLink(page, t('v2.sidebar.menu.settingsSubmenu.memberships')).click()
    await page.waitForURL(`**${ROUTES_V2.V2_SETTINGS_MEMBERSHIPS}`)

    await page.getByRole('button', { name: t('v2.membership.plans.new') }).first().click()
    await page.locator('#plan_name').fill(name)
    await page.locator('#plan_amount').fill('11000')
    await page.locator('#plan_weekly_quota').click()
    await page.getByRole('option', { name: '4', exact: true }).click()
    await page.getByRole('button', { name: t('v2.membership.plans.create.submit') }).click()
    await expect(page.getByText(t('v2.membership.plans.create.success'))).toBeVisible({
      timeout: 15_000,
    })

    // ------------------------------------------------------------------
    // 3. Volver al alta: el plan tiene que estar, sin F5 de por medio.
    // ------------------------------------------------------------------
    await sidebarLink(page, t('v2.sidebar.menu.customers')).click()
    await page.waitForURL(`**${ROUTES_V2.V2_CUSTOMERS}`)

    await openNewCustomerMembershipStep(page)
    await page.locator('#membership_type').click()

    await expect(page.getByRole('option', { name, exact: true })).toBeVisible()
  })

  test('el formulario rechaza un nombre duplicado', async ({ page }) => {
    const name = uniquePlanName()

    await gotoV2(page, ROUTES_V2.V2_SETTINGS_MEMBERSHIPS)

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await page.getByRole('button', { name: t('v2.membership.plans.new') }).first().click()
      await page.locator('#plan_name').fill(name)
      await page.locator('#plan_amount').fill('1000')
      await page.locator('#plan_weekly_quota').click()
      await page.getByRole('option', { name: '1', exact: true }).click()
      await page.getByRole('button', { name: t('v2.membership.plans.create.submit') }).click()

      if (attempt === 0) {
        await expect(page.getByText(t('v2.membership.plans.create.success'))).toBeVisible({
          timeout: 15_000,
        })
        await gotoV2(page, ROUTES_V2.V2_SETTINGS_MEMBERSHIPS)
      }
    }

    // El UNIQUE de `type` es la defensa real; esto verifica que el error llega
    // al operador como una frase y no como un código de Postgres.
    await expect(page.getByText(t('v2.membership.plans.create.duplicate'))).toBeVisible({
      timeout: 15_000,
    })
  })

  test('el nombre de los planes del catálogo no se puede editar', async ({ page }) => {
    await gotoV2(page, ROUTES_V2.V2_SETTINGS_MEMBERSHIPS)

    // Su etiqueta sale de la key i18n, así que un campo de nombre acá
    // renombraría el plan en un idioma y lo dejaría intacto en el otro.
    await page.getByRole('cell', { name: t('membership.typesShort.5_days'), exact: true }).click()

    await expect(page.getByRole('heading', { name: t('v2.membership.plans.edit.title') })).toBeVisible()
    await expect(page.locator('#plan_name')).toHaveCount(0)
    await expect(page.locator('#plan_amount')).toBeVisible()
  })
})
