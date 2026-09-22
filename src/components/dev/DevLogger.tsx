'use client'

/* eslint-disable no-console */
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Instrumentación de desarrollo. Inerte en producción y sin DEV_LOG_FILE.
 *
 * Parchea `window.fetch` para registrar las llamadas a Supabase (PostgREST y
 * RPC) con su payload y su respuesta, más navegaciones y errores de browser.
 * Todo se manda a `/api/devlog`, que lo escribe en un JSONL.
 *
 * Por qué del lado del cliente: el flujo que estamos probando —renovar
 * membresía, alta de cliente— llama al RPC desde el browser contra PostgREST.
 * El server de Next nunca lo ve.
 */

const MAX_BODY = 2500

type Entry = Record<string, unknown>

function send(entry: Entry) {
  try {
    void fetch('/api/devlog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Nunca romper la app por el logger.
  }
}

function truncate(text: string) {
  return text.length > MAX_BODY ? text.slice(0, MAX_BODY) + `…[+${text.length - MAX_BODY}]` : text
}

function parseBody(body: unknown): unknown {
  if (typeof body !== 'string') return body ? '[no-string body]' : undefined
  try {
    return JSON.parse(body)
  } catch {
    return truncate(body)
  }
}

function classify(url: string) {
  if (url.includes('/rest/v1/rpc/')) {
    return { kind: 'RPC', label: url.split('/rest/v1/rpc/')[1]?.split('?')[0] ?? 'rpc' }
  }
  if (url.includes('/rest/v1/')) {
    const rest = url.split('/rest/v1/')[1] ?? ''

    return { kind: 'REST', label: rest.split('?')[0] }
  }
  if (url.includes('/auth/v1/')) {
    return { kind: 'AUTH', label: url.split('/auth/v1/')[1]?.split('?')[0] ?? 'auth' }
  }
  if (url.startsWith('/api/')) {
    return { kind: 'API', label: url.split('?')[0] }
  }

  return null
}

export default function DevLogger() {
  const pathname = usePathname()

  useEffect(() => {
    send({ type: 'nav', pathname })
  }, [pathname])

  useEffect(() => {
    const w = window as unknown as { __devLoggerOn?: boolean }

    if (w.__devLoggerOn) return
    w.__devLoggerOn = true

    const originalFetch = window.fetch.bind(window)

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const method = (init?.method ?? (input as Request)?.method ?? 'GET').toUpperCase()

      // El propio sumidero y los assets de Next no se loguean: ruido y recursión.
      if (url.includes('/api/devlog') || url.includes('/_next/')) {
        return originalFetch(input as RequestInfo, init)
      }

      const meta = classify(url)

      if (!meta) return originalFetch(input as RequestInfo, init)

      const startedAt = performance.now()

      try {
        const response = await originalFetch(input as RequestInfo, init)
        const ms = Math.round(performance.now() - startedAt)
        let responseBody: unknown

        try {
          responseBody = truncate(await response.clone().text())
        } catch {
          responseBody = '[body ilegible]'
        }

        send({
          type: 'fetch',
          kind: meta.kind,
          label: meta.label,
          method,
          status: response.status,
          ms,
          // Los payloads de /auth/v1/ llevan tokens: se registra sólo el sobre.
          request: meta.kind === 'AUTH' ? '[omitido]' : parseBody(init?.body),
          response: meta.kind === 'AUTH' ? '[omitido]' : responseBody,
          url: url.replace(/^https?:\/\/[^/]+/, ''),
        })

        return response
      } catch (error) {
        send({
          type: 'fetch-error',
          kind: meta.kind,
          label: meta.label,
          method,
          ms: Math.round(performance.now() - startedAt),
          error: String(error),
        })
        throw error
      }
    }

    const originalConsoleError = console.error.bind(console)

    console.error = (...args: unknown[]) => {
      send({ type: 'console.error', args: args.map((a) => truncate(String(a))) })
      originalConsoleError(...args)
    }

    const onError = (event: ErrorEvent) => {
      send({ type: 'window.error', message: event.message, source: event.filename })
    }
    const onRejection = (event: PromiseRejectionEvent) => {
      send({ type: 'unhandledrejection', reason: truncate(String(event.reason)) })
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)

    send({ type: 'logger-ready', userAgent: navigator.userAgent, viewport: window.innerWidth })

    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
