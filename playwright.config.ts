import { defineConfig, devices } from '@playwright/test'
import { loadE2EEnv } from './e2e/support/env'

loadE2EEnv()

const PORT = 3001
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

// Pausa entre acciones, en ms. A velocidad normal una corrida con `--headed`
// es ilegible: la gracia de mirarla es ver qué hace el test, no que termine
// rápido. Con `E2E_SLOW_MO` seteado los timeouts se estiran en proporción,
// porque si no el propio slow motion hace fallar tests que estaban bien.
const SLOW_MO = Number(process.env.E2E_SLOW_MO ?? 0)
const TIMEOUT_MULTIPLIER = SLOW_MO > 0 ? 4 : 1

// El storageState de la sesión admin lo produce `auth.setup.ts` y lo consumen
// todos los proyectos de test. Vive fuera de `e2e/` para que no lo levante el
// globbing de specs y está gitignorado: contiene un JWT real.
export const ADMIN_STORAGE_STATE = 'e2e/.auth/admin.json'

export default defineConfig({
  testDir: './e2e',
  // Un alta de cliente en v2 dispara tres RPCs (cliente + membresía + pago)
  // contra la Supabase remota de dev. 30s alcanzan; 15s no siempre.
  timeout: 30_000 * TIMEOUT_MULTIPLIER,
  expect: { timeout: 10_000 * TIMEOUT_MULTIPLIER },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Serial a propósito: los tests escriben en la DB de dev, que es compartida
  // con el preview donde QA prueba. Con workers en paralelo, dos altas
  // simultáneas compiten por el rate limit de creación (10/hora) y los fallos
  // se vuelven indistinguibles de bugs reales.
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // El SW de la PWA cachea navegaciones y hace que los tests vean HTML viejo
    // de forma intermitente. Bloquearlo acá (y no con una env var en
    // `generate-sw.js`) tiene una ventaja concreta: funciona igual cuando la
    // suite reusa un `npm run dev` que ya estaba levantado.
    serviceWorkers: 'block',
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    launchOptions: { slowMo: SLOW_MO },
  },

  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'v2',
      testMatch: /.*\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: ADMIN_STORAGE_STATE },
    },
  ],

  // `reuseExistingServer` no es un detalle: en local Ema levanta el dev server
  // en su propia consola, y la suite se cuelga de ese. Sólo lo arranca cuando
  // no hay nada escuchando en el puerto.
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
