import { config as loadDotenv } from 'dotenv'
import path from 'node:path'

/**
 * Next carga `.env.local` solo; Playwright no. Sin esto, la suite arranca sin
 * credenciales y falla en el login con un timeout genérico que no dice nada.
 */
export function loadE2EEnv(): void {
  loadDotenv({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })
}

interface E2ECredentials {
  email: string
  password: string
}

/**
 * Credenciales del usuario admin de e2e.
 *
 * Falla ruidoso y con la instrucción de cómo arreglarlo: el modo de fallo más
 * probable acá no es un bug del test, es que las variables no estén cargadas.
 */
export function getAdminCredentials(): E2ECredentials {
  const email = process.env.E2E_USER_EMAIL_ADMIN
  const password = process.env.E2E_USER_PASSWORD_ADMIN

  if (!email || !password) {
    throw new Error(
      'Faltan E2E_USER_EMAIL_ADMIN / E2E_USER_PASSWORD_ADMIN en .env.local.\n' +
        'Son las credenciales de un usuario real de la Supabase de dev que tenga el ' +
        'feature flag `v2_access`. Ver .env.example.'
    )
  }

  return { email, password }
}

/**
 * Credenciales del usuario NO admin. Todavía no hay uno cargado: los specs que
 * cubran permisos (VIP, tab de pagos) lo van a necesitar, y hasta entonces esto
 * existe para que el día que se agregue no haya que inventar la convención.
 */
export function getStaffCredentials(): E2ECredentials | null {
  const email = process.env.E2E_USER_EMAIL
  const password = process.env.E2E_USER_PASSWORD

  if (!email || !password) return null

  return { email, password }
}

export const TENANT = process.env.TENANT ?? 'actitud'
export const APP_LANGUAGE = process.env.APP_LANGUAGE ?? 'es'
