import { NextResponse } from 'next/server'

/**
 * Traduce un error de las funciones server de accounting a una respuesta JSON
 * consistente. `requireAdmin()` lanza 'Insufficient permissions', que debe
 * mapear a 403 (Forbidden) en vez de 500 para que el caller distinga un
 * problema de permisos de un error real del servidor.
 */
export function accountingErrorResponse(
  error: unknown,
  fallbackMessage: string,
  data: unknown = null
) {
  const message = error instanceof Error ? error.message : fallbackMessage
  const status = message === 'Insufficient permissions' ? 403 : 500

  return NextResponse.json({ data, success: false, error: message }, { status })
}
