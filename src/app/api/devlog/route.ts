/* eslint-disable no-console */
import { appendFileSync } from 'node:fs'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Sumidero de logs de desarrollo. Devuelve 404 sin DEV_LOG_FILE o en producción.
 *
 * Existe porque el RPC de pago se llama **desde el browser** directo a
 * PostgREST: no pasa por el server de Next, así que ni el middleware ni los
 * route handlers lo ven. El DevLogger del cliente parchea `fetch`, manda acá
 * lo que captura, y esto lo escribe en un JSONL que se puede tailear desde
 * fuera del navegador.
 */

const LOG_FILE = process.env.DEV_LOG_FILE

function isDisabled() {
  return process.env.NODE_ENV === 'production' || !LOG_FILE
}

export async function POST(request: NextRequest) {
  if (isDisabled()) {
    return new NextResponse('Not found', { status: 404 })
  }

  try {
    const entry = await request.json()
    const line = JSON.stringify({ ts: new Date().toISOString(), ...entry })

    appendFileSync(LOG_FILE as string, line + '\n')
    // También a stdout del dev server, para verlo sin abrir el archivo.
    console.log('[devlog]', line)
  } catch (error) {
    console.log('[devlog] entrada inválida', error)
  }

  return new NextResponse(null, { status: 204 })
}
