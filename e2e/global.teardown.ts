import { test as teardown } from '@playwright/test'
import { execFileSync } from 'node:child_process'

/**
 * Limpieza automática de los datos que deja la suite.
 *
 * Corre como proyecto de teardown, así que se ejecuta al final **aunque los
 * tests fallen** — que es justo cuando más importa: un fallo a mitad del flujo
 * de alta deja un cliente a medio crear en la base que comparten desarrollo y
 * el preview donde prueba QA.
 *
 * Invoca `scripts/e2e-clean.sh` en vez de reimplementar el borrado. La
 * alternativa era hacerlo desde supabase-js, y no funciona: de las cuatro
 * tablas involucradas sólo `membership_payments` tiene política de DELETE bajo
 * RLS, así que un borrado de clientes como usuario admin no falla — simplemente
 * afecta cero filas y deja todo en su lugar. El script va por la conexión
 * directa de Postgres, que no pasa por RLS.
 *
 * Para inspeccionar los datos después de una corrida: `E2E_SKIP_TEARDOWN=1`.
 */
teardown('limpiar datos de test', async () => {
  if (process.env.E2E_SKIP_TEARDOWN === '1') {
    console.log('⏭  Teardown salteado por E2E_SKIP_TEARDOWN=1 — los datos [E2E] quedan en la DB.')

    return
  }

  try {
    const output = execFileSync('./scripts/e2e-clean.sh', {
      encoding: 'utf8',
      env: { ...process.env, E2E_CLEAN_ASSUME_YES: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const deleted = output.match(/DELETE (\d+)/g)?.join(' · ') ?? 'sin filas'

    console.log(`🧹 Limpieza de datos e2e completada (${deleted}).`)
  } catch (error) {
    // No se re-lanza a propósito: si la limpieza falla, los tests que pasaron
    // pasaron. Convertir esto en un fallo de la suite haría que un problema de
    // conectividad con la DB se lea como una regresión de la app.
    const message = error instanceof Error ? error.message : String(error)

    console.warn(
      `⚠️  La limpieza automática falló: ${message}\n` +
        '   Los datos [E2E] siguen en la DB. Corré `npm run test:e2e:clean` a mano.'
    )
  }
})
