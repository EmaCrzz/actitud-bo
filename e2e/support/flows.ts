import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { gotoV2 } from './fixtures'
import { t } from './i18n'
import { buildTestCustomer, type TestCustomer } from './data'
import { ROUTES_V2 } from '@/consts/routes'

/**
 * Selecciona la primera opción de un Select de Radix por el id de su trigger.
 *
 * Radix no renderiza un `<select>` nativo, así que `selectOption` no aplica.
 * Se elige "la primera" y no un valor fijo a propósito: el catálogo de
 * membresías y las formas de pago son datos editables desde Configuración, y
 * fijar "Mensual" haría que renombrar un plan rompa un test de alta.
 */
export async function selectFirstOption(page: Page, triggerId: string): Promise<void> {
  await page.locator(`#${triggerId}`).click()
  await page.getByRole('option').first().click()
}

/**
 * Da de alta un cliente por la UI y devuelve sus datos.
 *
 * Vive acá y no en un spec porque el flujo de asistencia también necesita un
 * cliente propio: la migración 20260917120100 puso un UNIQUE de asistencia por
 * día, así que un spec que registre asistencia sobre un cliente fijo pasa la
 * primera corrida del día y falla las siguientes. Creando uno nuevo cada vez,
 * el test es repetible.
 *
 * Recordar que en v2 toda alta cobra: esto también crea membresía y pago.
 */
export async function createCustomerViaUI(page: Page, label: string): Promise<TestCustomer> {
  const customer = buildTestCustomer(label)

  await gotoV2(page, ROUTES_V2.V2_CUSTOMERS)
  await page.getByRole('button', { name: t('v2.customers.newCustomer') }).click()

  // Por `heading` y no por texto: "Nuevo cliente" es a la vez el botón que
  // abre el panel y el título del panel abierto.
  await expect(page.getByRole('heading', { name: t('v2.customers.form.title') })).toBeVisible()

  // Los campos por id. Los labels del form son palabras cortas y genéricas
  // ("Nombre", "DNI") que reaparecen como encabezados de tabla y como texto de
  // la pantalla de fondo, y `getByLabel` matchea por substring.
  await page.locator('#first_name').fill(customer.firstName)
  await page.locator('#last_name').fill(customer.lastName)
  await page.locator('#person_id').fill(customer.personId)
  await page.locator('#phone').fill(customer.phone)

  await page.getByRole('button', { name: t('common.next') }).click()
  await expect(page.getByText(t('v2.customers.form.stepMembership'))).toBeVisible()

  await selectFirstOption(page, 'membership_type')
  await selectFirstOption(page, 'payment_type')

  await page.getByRole('button', { name: t('v2.customers.form.submit') }).click()
  await expect(page.getByText(t('v2.customers.form.successMessage'))).toBeVisible({
    timeout: 20_000,
  })

  return customer
}
