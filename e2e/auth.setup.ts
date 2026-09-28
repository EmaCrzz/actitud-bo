import { test as setup, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { ADMIN_STORAGE_STATE } from '../playwright.config'
import { getAdminCredentials } from './support/env'
import { sidebarLink } from './support/fixtures'
import { t } from './support/i18n'
import { HOME, V2_HOME } from '@/consts/routes'

const LOGIN_PATH = '/auth/login'

/**
 * Login único para toda la suite.
 *
 * El endpoint de login tiene rate limit de 5 por minuto. Loguear dentro de cada
 * spec agota esa cuota al sexto test y produce fallos que parecen bugs de auth
 * pero son 429. Acá se loguea una vez, se serializa la sesión a disco y los
 * proyectos de test arrancan ya autenticados vía `storageState`.
 */
setup('autenticar admin y verificar acceso v2', async ({ page }) => {
  const { email, password } = getAdminCredentials()

  await page.goto(LOGIN_PATH)

  // Por id y no por label: el campo de contraseña convive con el botón de
  // mostrarla, cuyo aria-label ("Mostrar contraseña") contiene el label del
  // input, y `getByLabel` matchea por substring — con lo que resuelve a dos
  // elementos y falla por strict mode.
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: t('buttons.login') }).click()

  // El form redirige a HOME al autenticar. Si las credenciales están mal, la
  // app muestra el error inline y nunca navega — de ahí que se espere la URL y
  // no un elemento.
  await page.waitForURL(`**${HOME}`, { timeout: 15_000 }).catch(() => {
    throw new Error(
      `El login no redirigió a ${HOME}. Revisá que E2E_USER_EMAIL_ADMIN / ` +
        'E2E_USER_PASSWORD_ADMIN correspondan a un usuario válido de la Supabase de dev.'
    )
  })

  // Verificación de `v2_access`, y no un seed que lo cree.
  //
  // Crear el flag requeriría la service_role key, que no está en el entorno
  // local. Pero el modo de fallo que importa no es "el flag nunca existió",
  // es "un restore del backup de prod vació `user_feature_flags`" — algo que
  // pasa cada tanto y deja a toda la suite v2 fallando con 404s que parecen
  // rutas rotas. Chequearlo acá convierte media hora de debug en un mensaje.
  await page.goto(V2_HOME)
  await page.waitForLoadState('networkidle')

  if (!page.url().includes(V2_HOME)) {
    throw new Error(
      `El usuario ${email} no tiene el feature flag \`v2_access\`: ${V2_HOME} redirigió a ` +
        `${page.url()}.\n` +
        'Suele pasar después de restaurar el backup de prod sobre dev, que deja ' +
        '`user_feature_flags` vacía. Recreá el flag para este usuario y volvé a correr.'
    )
  }

  await expect(sidebarLink(page, t('v2.sidebar.menu.customers'))).toBeVisible()

  fs.mkdirSync(path.dirname(ADMIN_STORAGE_STATE), { recursive: true })
  await page.context().storageState({ path: ADMIN_STORAGE_STATE })
})
