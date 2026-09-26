import { test, expect, gotoV2 } from '../support/fixtures'
import { t } from '../support/i18n'
import { fullName } from '../support/data'
import { createCustomerViaUI } from '../support/flows'
import { ROUTES_V2 } from '@/consts/routes'

/**
 * Registro de asistencia desde el buscador del home.
 *
 * El cliente se crea dentro del test en vez de usar uno fijo por el UNIQUE de
 * asistencia por día (migración 20260917120100): con un cliente fijo, el spec
 * pasaría la primera corrida del día y fallaría el resto con un error de
 * duplicado que no es un bug.
 */
test.describe('v2 · registro de asistencia', () => {
  test('busca un cliente desde el home y registra su asistencia', async ({
    page,
    consoleErrors,
  }) => {
    const customer = await createCustomerViaUI(page, 'asistencia')

    await gotoV2(page, ROUTES_V2.V2_HOME)

    // La búsqueda es con debounce: se escribe el apellido (único por corrida)
    // y se espera que el dropdown liste al cliente.
    await page.getByPlaceholder(t('v2.home.attendanceSearch.placeholder')).fill(customer.lastName)

    const result = page.getByText(fullName(customer)).first()

    await expect(result).toBeVisible({ timeout: 15_000 })
    await result.click()

    // Seleccionarlo lo convierte en un chip y habilita el CTA.
    await page.getByRole('button', { name: t('v2.home.attendanceSearch.cta') }).click()

    // El modal se identifica por su título, que es el nombre del cliente. La
    // palabra "Asistencia" no sirve de ancla: aparece en el menú, en dos
    // métricas del home y en el propio CTA.
    await expect(page.getByRole('heading', { name: fullName(customer) })).toBeVisible({
      timeout: 15_000,
    })

    // El CTA nace deshabilitado y se habilita cuando terminan de cargar los
    // datos del cliente. `click()` espera a que sea accionable, así que esto
    // cubre la espera sin un sleep arbitrario.
    await page.getByRole('button', { name: t('v2.home.attendanceModal.confirmCta') }).click()

    // El modal queda abierto ~2s mostrando la animación de éxito y después se
    // cierra solo. Se espera a que el CTA desaparezca en vez de dormir un tiempo
    // fijo.
    await expect(
      page.getByRole('button', { name: t('v2.home.attendanceModal.confirmCta') })
    ).toBeHidden({ timeout: 15_000 })

    expect(consoleErrors).toEqual([])
  })

  test('el buscador avisa cuando no hay coincidencias', async ({ page }) => {
    await gotoV2(page, ROUTES_V2.V2_HOME)

    const query = 'zzzz-no-existe-zzzz'

    await page.getByPlaceholder(t('v2.home.attendanceSearch.placeholder')).fill(query)

    await expect(
      page.getByText(t('v2.home.attendanceSearch.noResults', { query }))
    ).toBeVisible({ timeout: 15_000 })
  })
})
