/** Los `searchParams` que Next entrega a un server component. */
export type RawSearchParams = Record<string, string | string[] | undefined>

/**
 * Lee un query param como string, o `null` si no vino o vino vacío.
 *
 * Next tipa cada valor como `string | string[]` porque un mismo parámetro puede
 * repetirse en la URL (`?q=a&q=b`); acá se toma el primero, que es lo que hace
 * cualquiera de nuestras pantallas.
 *
 * Vive en `lib/` porque lo usan dos dominios —el listado de clientes y la
 * sección de asistencias— y era privado del primero.
 */
export function readParam(params: RawSearchParams, key: string): string | null {
  const value = params[key]
  const raw = Array.isArray(value) ? value[0] : value

  return raw?.trim() ? raw.trim() : null
}

/**
 * Página 0-indexed leída de un query param 1-indexed.
 *
 * Cualquier valor inválido o menor a 1 cae en la primera: un query param roto
 * no rompe la pantalla. En la URL va 1-indexed porque es el número que el
 * usuario ve en el paginador.
 */
export function parsePageParam(params: RawSearchParams, key: string): number {
  const raw = readParam(params, key)
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN

  return Number.isFinite(parsed) && parsed > 1 ? parsed - 1 : 0
}
