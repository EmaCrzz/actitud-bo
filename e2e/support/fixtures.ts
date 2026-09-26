import { test as base, expect, type Page } from '@playwright/test'

/**
 * Ruido de consola que no indica un problema de la app y que, si no se filtra,
 * vuelve inútil la aserción de "cero errores".
 */
const IGNORED_CONSOLE_PATTERNS = [
  /favicon\.ico/i,
  // React DevTools nag en dev.
  /Download the React DevTools/i,
  // El SW está bloqueado a propósito por `serviceWorkers: 'block'`; el registro
  // falla y lo loguea. Es consecuencia de la config de test, no un bug.
  /ServiceWorker|SW:/i,
  // "Failed to load resource" sin la URL no sirve para nada. Los fallos de red
  // se capturan aparte, en el listener de `response`, que sí tiene la URL.
  /Failed to load resource/i,
]

/**
 * Requests fallidos que no son un problema de la app.
 */
const IGNORED_REQUEST_PATTERNS = [
  /favicon\.ico/i,
  /\/sw\.js/i,
  // Next en dev pide los source maps de sus propios chunks y a veces no están.
  /\.map$/i,
  // `/api/devlog` responde 404 a propósito cuando no hay `DEV_LOG_FILE` seteado
  // (ver el docblock de su route handler). El DevLogger del cliente lo llama
  // igual en cada request que parchea, así que sin esta excepción toda pantalla
  // que dispare un RPC acumula 404s que son el comportamiento correcto.
  /\/api\/devlog/i,
]

function isRelevantError(text: string): boolean {
  return !IGNORED_CONSOLE_PATTERNS.some((pattern) => pattern.test(text))
}

interface Fixtures {
  /**
   * Errores de consola y excepciones no atrapadas acumulados durante el test.
   *
   * Existe porque buena parte de las regresiones de v2 no rompen la pantalla:
   * un server component que revienta y cae al error boundary, un RPC que
   * devuelve 400, una key de i18n faltante. La pantalla se ve "bien" y el
   * único testigo es la consola.
   */
  consoleErrors: string[]
}

export const test = base.extend<Fixtures>({
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = []

    page.on('console', (message) => {
      if (message.type() !== 'error') return
      const text = message.text()

      if (isRelevantError(text)) errors.push(text)
    })

    page.on('pageerror', (error) => {
      errors.push(`[pageerror] ${error.message}`)
    })

    // Los fallos de red se registran con su URL. Un "404" pelado en la consola
    // no permite distinguir un asset opcional de un RPC roto.
    page.on('response', (response) => {
      const status = response.status()

      if (status < 400) return
      const url = response.url()

      if (IGNORED_REQUEST_PATTERNS.some((pattern) => pattern.test(url))) return
      errors.push(`[http ${status}] ${url}`)
    })

    await use(errors)
  },
})

export { expect }

/**
 * Espera a que una pantalla v2 esté realmente lista.
 *
 * Las páginas v2 son server components que resuelven varios RPCs en paralelo;
 * `domcontentloaded` llega mucho antes que los datos y produce asserts que
 * fallan de forma intermitente.
 */
export async function gotoV2(page: Page, route: string): Promise<void> {
  await page.goto(route)
  await page.waitForLoadState('networkidle')
}

/**
 * Link del menú lateral, con match exacto.
 *
 * El `exact` no es cosmético: `getByRole` matchea por substring, y varios
 * ítems del menú son prefijo de contenido de las pantallas — "Clientes"
 * también matchea la card "Clientes activos del mes" del home, y la aserción
 * falla por strict mode en vez de por el motivo que se quería verificar.
 */
export function sidebarLink(page: Page, name: string) {
  return page.getByRole('link', { name, exact: true })
}
