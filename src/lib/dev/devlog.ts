/**
 * Log de desarrollo del lado del servidor.
 *
 * Complementa a [src/components/dev/DevLogger.tsx], que parchea `fetch` en el
 * browser. Los dos escriben al mismo JSONL, así que una sesión de prueba queda
 * en un solo archivo ordenado por tiempo.
 *
 * Hace falta porque el browser no ve todo: las páginas v2 son server
 * components y sus consultas a Supabase nunca pasan por `window.fetch`. Si sólo
 * instrumentás el cliente, una pantalla que renderiza en el server se ve como
 * un hueco en el log.
 *
 * Uso:
 *
 *   import { devlog } from '@/lib/dev/devlog'
 *   devlog('incomes.summary', { recent: rows.length })
 *
 * No-op salvo que `DEV_LOG_FILE` esté seteada y no estemos en producción, así
 * que las llamadas pueden quedar en el código sin costo. Para activarlo:
 *
 *   DEV_LOG_FILE=/ruta/al/devlog.jsonl npm run dev
 *
 * Nunca lanza: un logger que rompe la request que está observando no sirve.
 */

const MAX_PAYLOAD = 4000

function isEnabled() {
  return (
    process.env.NODE_ENV !== 'production' &&
    !!process.env.DEV_LOG_FILE &&
    typeof window === 'undefined'
  )
}

export function devlog(event: string, payload?: unknown) {
  if (!isEnabled()) return

  void (async () => {
    try {
      const { appendFileSync } = await import('node:fs')
      let serialized = JSON.stringify(payload ?? null)

      if (serialized && serialized.length > MAX_PAYLOAD) {
        serialized = serialized.slice(0, MAX_PAYLOAD) + `…[+${serialized.length - MAX_PAYLOAD}]`
      }

      const line = JSON.stringify({
        ts: new Date().toISOString(),
        type: 'server',
        event,
        payload: serialized,
      })

      appendFileSync(process.env.DEV_LOG_FILE as string, line + '\n')
    } catch {
      // Silencio deliberado.
    }
  })()
}
