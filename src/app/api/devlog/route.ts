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

function notFound() {
  return new NextResponse('Not found', { status: 404 })
}

/**
 * GET existe sólo para que la ruta no se delate por el método.
 *
 * Con únicamente `POST` exportado, un GET —lo que pasa al pegar la URL en la
 * barra del navegador— lo contesta el router de Next con **405** antes de
 * llegar a la guarda de abajo. Un 405 dice "la ruta existe pero no con ese
 * verbo", que es justo lo que no queremos publicar en un deploy de producción:
 * el endpoint no acepta datos, pero se anuncia. Verificado en el preview el
 * 2026-09-21: GET daba 405 y POST 404.
 *
 * Con este handler, en producción **todos** los métodos dan 404. En desarrollo
 * el GET devuelve 405 con una pista, que es la respuesta útil para alguien que
 * abrió la URL a mano queriendo ver el log.
 */
export async function GET() {
  if (isDisabled()) return notFound()

  return new NextResponse('El sumidero de logs acepta POST. Ver docs/dev-logging.md\n', {
    status: 405,
    headers: { Allow: 'POST' },
  })
}

export async function POST(request: NextRequest) {
  if (isDisabled()) {
    return notFound()
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
