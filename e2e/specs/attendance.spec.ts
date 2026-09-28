import { test, expect, gotoV2 } from '../support/fixtures'
import { t } from '../support/i18n'
import { fullName } from '../support/data'
import { createCustomerViaUI, registerAssistanceViaUI } from '../support/flows'
import { findLatestAssistanceByPersonId } from '../support/db'
import { toAppTzIsoDate, dateMismatchHint } from '../support/dates'
import { ROUTES_V2 } from '@/consts/routes'
import { getTodayIsoDateInAppTz, shiftIsoDateInAppTz } from '@/lib/timezone'
import { ATTENDANCE_PAGE_SIZE } from '@/assistance/utils'

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

    await registerAssistanceViaUI(page, customer)

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

/**
 * Sección Asistencias (fase 9).
 *
 * Lo que cubre y por qué: la lista se arma filtrando `assistance_date` por el
 * rango del día **en hora argentina**. Si ese rango se construyera con un
 * `new Date(iso)` en vez de `parseAppTzDateString`, la pantalla se vería
 * perfecta y mostraría el día equivocado — el modo de fallo silencioso que ya
 * apareció dos veces en este repo (ADR 20260709153000). Registrar una
 * asistencia y exigir que aparezca hoy es la forma barata de detectarlo.
 */
test.describe('v2 · sección asistencias', () => {
  test('la asistencia recién registrada aparece en el día de hoy', async ({
    page,
    consoleErrors,
  }) => {
    const customer = await createCustomerViaUI(page, 'seccion-asist')

    await registerAssistanceViaUI(page, customer)
    await gotoV2(page, ROUTES_V2.V2_ATTENDANCE)

    // El tab por defecto es "Registro diario": sin `?date=` en la URL.
    expect(page.url()).not.toContain('date=')

    const row = page
      .locator('#attendance-list')
      .getByRole('listitem')
      .filter({ hasText: fullName(customer) })

    await expect(row).toBeVisible({ timeout: 15_000 })

    // La línea secundaria es el plan de membresía. No se afirma cuál —el alta
    // elige la primera opción del catálogo, que es dato editable— sino que no
    // cayó en el texto de "sin membresía": el cliente acaba de ser dado de alta
    // y toda alta de v2 crea membresía.
    await expect(row).not.toContainText(t('v2.attendance.row.noMembership'))

    // La hora ocupa el lugar que en el resto de las listas tiene el badge.
    await expect(row.locator('time')).toHaveText(/^\d{2}:\d{2}$/)

    // Y el día que quedó guardado es efectivamente hoy en AR. La pantalla no
    // muestra el timestamp, así que esto sólo se puede verificar contra la DB.
    const stored = await findLatestAssistanceByPersonId(customer.personId)

    expect(stored, 'no se encontró la asistencia recién registrada').not.toBeNull()

    const todayIso = getTodayIsoDateInAppTz()

    expect(
      toAppTzIsoDate(stored!.assistance_date),
      dateMismatchHint('assistance_date', todayIso, stored!.assistance_date)
    ).toBe(todayIso)

    expect(consoleErrors).toEqual([])
  })

  test('el contador y el buscador aparecen sólo si el día tuvo asistencias', async ({
    page,
    consoleErrors,
  }) => {
    await gotoV2(page, ROUTES_V2.V2_ATTENDANCE)

    const rows = await page.locator('#attendance-list').getByRole('listitem').count()
    const search = page.getByPlaceholder(t('v2.attendance.searchPlaceholder'))
    const counter = page.locator('#attendance-count')

    if (rows === 0) {
      // Sin asistencias no hay contador —un "0" junto al estado vacío repite el
      // dato— ni buscador: filtrar una lista vacía no lleva a ningún lado. Se
      // afirma la ausencia en vez de saltear el caso, así el test sirve igual
      // el día que el gimnasio no abrió.
      await expect(counter).toBeHidden()
      await expect(search).toBeHidden()
    } else {
      await expect(search).toBeVisible()
      // El número nunca va suelto: lleva el label que dice de qué habla.
      await expect(counter).toContainText(t('v2.attendance.count.total'))
      // El contador cuenta el día entero, así que sólo coincide con las filas a
      // la vista cuando el día entra en una página.
      if (rows < ATTENDANCE_PAGE_SIZE) await expect(counter).toContainText(String(rows))
    }

    expect(consoleErrors).toEqual([])
  })

  test('la lista pagina de a 10 y el buscador filtra', async ({ page, consoleErrors }) => {
    const customer = await createCustomerViaUI(page, 'paginacion')

    await registerAssistanceViaUI(page, customer)
    await gotoV2(page, ROUTES_V2.V2_ATTENDANCE)

    const rows = page.locator('#attendance-list').getByRole('listitem')

    // La página nunca muestra más de 10, tenga el día las que tenga.
    expect(await rows.count()).toBeLessThanOrEqual(ATTENDANCE_PAGE_SIZE)

    // Buscar por el apellido —único por corrida— tiene que dejar exactamente una
    // fila, sin importar en qué página del día haya caído el cliente.
    await page.getByPlaceholder(t('v2.attendance.searchPlaceholder')).fill(customer.lastName)

    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText(fullName(customer))

    // Con búsqueda activa el contador pasa a hablar de resultados, no del total
    // del día. El label es justamente lo que hace legible ese cambio.
    const counter = page.locator('#attendance-count')

    await expect(counter).toContainText(t('v2.attendance.count.results'))
    await expect(counter).toContainText('1')

    // La búsqueda queda en la URL, así que la vista es compartible y sobrevive
    // a un F5. Se escribe con `history.replaceState`, sin navegación.
    await expect(page).toHaveURL(new RegExp(`q=${customer.lastName.replace(/\s/g, '\\+')}`))

    // Y recargar la reconstruye desde la URL en vez de perderla.
    await page.reload()
    await expect(page.getByPlaceholder(t('v2.attendance.searchPlaceholder'))).toHaveValue(
      customer.lastName
    )
    await expect(rows).toHaveCount(1)

    // Una búsqueda sin coincidencias muestra "sin resultados", no el vacío del
    // día, y el campo sigue en pantalla para poder borrarla.
    const search = page.getByPlaceholder(t('v2.attendance.searchPlaceholder'))

    await search.fill('zzzz-no-existe-zzzz')
    await expect(page.getByText(t('v2.attendance.noResults.title'))).toBeVisible()
    await expect(search).toBeVisible()

    expect(consoleErrors).toEqual([])
  })

  test('el tab Historial abre en ayer y no deja avanzar hasta hoy', async ({
    page,
    consoleErrors,
  }) => {
    await gotoV2(page, ROUTES_V2.V2_ATTENDANCE)

    await page.getByRole('tab', { name: t('v2.attendance.tabs.history') }).click()

    const yesterdayIso = shiftIsoDateInAppTz(getTodayIsoDateInAppTz(), -1)

    await page.waitForURL(`**${ROUTES_V2.V2_ATTENDANCE}?date=${yesterdayIso}`)

    const nav = page.locator('#attendance-date-nav-desktop')

    await expect(nav).toContainText(t('assistance.dayNavigator.yesterday'))

    // El tope del tab: "hoy" tiene su propio tab, así que el Historial no puede
    // llegar hasta ahí y dejar la misma lista con el tab equivocado activo.
    await expect(
      nav.getByRole('button', { name: t('assistance.dayNavigator.nextDay') })
    ).toBeDisabled()

    // Y volver al primer tab devuelve la URL canónica, sin `?date=`.
    await page.getByRole('tab', { name: t('v2.attendance.tabs.daily') }).click()
    await page.waitForURL(`**${ROUTES_V2.V2_ATTENDANCE}`)
    expect(page.url()).not.toContain('date=')

    expect(consoleErrors).toEqual([])
  })

  test('una fecha imposible en la URL devuelve 404', async ({ page }) => {
    // 31 de febrero: pasa el formato y no existe en el calendario. `new Date`
    // lo aceptaría corriéndolo al 3 de marzo, que es justo lo que la
    // validación evita.
    const response = await page.goto(`${ROUTES_V2.V2_ATTENDANCE}?date=2026-02-31`)

    expect(response?.status()).toBe(404)
  })

  test('`?date=` apuntando a hoy redirige a la URL canónica', async ({ page }) => {
    await page.goto(`${ROUTES_V2.V2_ATTENDANCE}?date=${getTodayIsoDateInAppTz()}`)
    await page.waitForURL(`**${ROUTES_V2.V2_ATTENDANCE}`)

    expect(page.url()).not.toContain('date=')
  })

  test('el redirect de hoy conserva la búsqueda', async ({ page }) => {
    // El redirect saca sólo el parámetro redundante. Sin este test, una
    // regresión acá se manifiesta como "recargar una vista filtrada la
    // desfiltra", que es de las que nadie reporta y todos sufren.
    //
    // Sólo se afirma sobre `q`. El redirect también conserva `page`, pero eso
    // no es observable acá: al montar, `safePage` recorta la página a la última
    // que exista para los resultados actuales, y una búsqueda sin coincidencias
    // sólo tiene la primera. Verificarlo de verdad necesita un día con más de
    // 10 asistencias — ver "lo que quedó sin cubrir" en el ADR.
    await page.goto(
      `${ROUTES_V2.V2_ATTENDANCE}?date=${getTodayIsoDateInAppTz()}&q=zzzz-no-existe-zzzz`
    )
    await page.waitForURL(/q=zzzz-no-existe-zzzz/)

    expect(page.url()).not.toContain('date=')
  })

  test('un `?q=` sobre un día sin asistencias no deja la pantalla trabada', async ({ page }) => {
    // Con el día vacío el buscador no se renderiza —no hay nada que filtrar—,
    // así que si la query igual se aplicara, la pantalla diría "sin resultados"
    // sin ningún campo con el que borrarla.
    const emptyDay = shiftIsoDateInAppTz(getTodayIsoDateInAppTz(), -13)

    await gotoV2(page, `${ROUTES_V2.V2_ATTENDANCE}?date=${emptyDay}&q=zzzz-no-existe-zzzz`)

    // El día elegido es de hace casi dos semanas, pero la DB de dev es un
    // backup de producción: si resulta que tuvo movimiento, el caso a verificar
    // no se da y el test no tiene nada que afirmar.
    //
    // La condición mira **si el buscador se renderizó**, no cuántas filas hay.
    // Contar filas era el guard original y no funciona justamente acá: con un
    // `?q=` que no matchea, un día con asistencias también muestra cero filas,
    // así que el skip no se disparaba y el test fallaba contra el estado "sin
    // resultados". El buscador, en cambio, aparece sólo si el día tuvo
    // asistencias — es la señal que el guard necesita.
    const dayHadAssistances = await page
      .getByPlaceholder(t('v2.attendance.searchPlaceholder'))
      .isVisible()

    test.skip(dayHadAssistances, 'el día elegido tiene asistencias; no aplica el caso vacío')

    await expect(page.getByText(t('v2.attendance.empty.title'))).toBeVisible()
    await expect(page.getByText(t('v2.attendance.noResults.title'))).toBeHidden()
  })
})
