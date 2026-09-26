import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { gotoV2 } from './fixtures'
import { t } from './i18n'
import { buildTestCustomer, fullName, type TestCustomer } from './data'
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

export interface RenewalResult {
  /** "YYYY-MM-DD" que quedó elegido en el datepicker de inicio del período. */
  startDate: string
  /** "YYYY-MM-DD" que quedó elegido en el datepicker de vencimiento. */
  endDate: string
}

/**
 * Cobra una renovación desde "Registrar pago" del home y devuelve las fechas
 * que el operador dejó elegidas.
 *
 * Devolver las fechas es el punto: son lo que el test compara contra lo que
 * terminó guardado en la DB. Se leen del `<input type="hidden">` que expone el
 * DatePicker, que es exactamente el "YYYY-MM-DD" que viaja en el FormData — no
 * una reconstrucción del texto que se ve en pantalla.
 */
export async function renewMembershipViaUI(
  page: Page,
  customer: TestCustomer
): Promise<RenewalResult> {
  await gotoV2(page, ROUTES_V2.V2_HOME)
  await page.getByRole('button', { name: t('v2.home.quickActions.registerPayment') }).click()

  await expect(page.getByRole('heading', { name: t('v2.membership.renew.title') })).toBeVisible()

  // Paso de búsqueda: el panel abre en el buscador cuando no se entró desde el
  // perfil de un cliente.
  await page.getByPlaceholder(t('v2.membership.renew.search.placeholder')).fill(customer.lastName)
  await page.getByText(fullName(customer)).first().click()

  await expect(page.locator('#renew_membership_type')).toBeVisible({ timeout: 15_000 })
  await selectFirstOption(page, 'renew_membership_type')
  await selectFirstOption(page, 'renew_payment_type')

  // Las fechas se leen DESPUÉS de elegir el tipo de membresía: el período se
  // recalcula al cambiarlo, así que leerlas antes daría las del plan anterior.
  const startDate = await readDatePickerValue(page, 'renew_start_date')
  const endDate = await readDatePickerValue(page, 'renew_end_date')

  await page.getByRole('button', { name: t('common.next') }).click()
  // `exact`: el home queda detrás del panel y su card "Resumen del día"
  // matchea "Resumen" por substring.
  await expect(
    page.getByText(t('v2.membership.renew.summary.title'), { exact: true })
  ).toBeVisible()

  await page.getByRole('button', { name: t('v2.membership.renew.submit') }).click()
  await expect(page.getByText(t('v2.membership.renew.success.title'))).toBeVisible({
    timeout: 20_000,
  })

  return { startDate, endDate }
}

/**
 * Lee el "YYYY-MM-DD" que el DatePicker mantiene en su input oculto.
 *
 * El input es `hidden`, así que `inputValue()` es la única vía: cualquier
 * aserción sobre el texto visible leería el formato "dd/mm/yyyy" y obligaría a
 * reconvertirlo, que es justo la clase de conversión que estos tests vigilan.
 */
async function readDatePickerValue(page: Page, name: string): Promise<string> {
  const value = await page.locator(`input[type="hidden"][name="${name}"]`).inputValue()

  if (!value) throw new Error(`El datepicker \`${name}\` quedó vacío; no hay fecha que verificar.`)

  return value
}
