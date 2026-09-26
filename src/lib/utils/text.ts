/**
 * Removes diacritics (á → a, ñ → n) without touching casing or punctuation.
 */
export function removeAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
}

/**
 * Normalizes text by converting to lowercase, removing accents, and special characters
 * Useful for search functionality and text comparison
 */
export function normalizeText(text: string): string {
  return removeAccents(text.toLowerCase()).replace(/[^\w\s]/g, '') // Remove special characters
}

/**
 * Pone en mayúscula **sólo la primera letra**, dejando el resto intacto.
 *
 * Existe porque `text-transform: capitalize` de CSS capitaliza cada palabra, y
 * sobre una fecha larga en español eso produce "Jueves, 24 **De** Septiembre".
 * `Intl` devuelve el día en minúscula ("jueves 24 de septiembre") y lo único
 * que hay que corregir es el arranque de la oración.
 */
export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Normaliza el término de búsqueda para que matchee la columna generada
 * `customers.full_name_search` (lower + unaccent).
 *
 * A diferencia de `normalizeText`, NO quita puntuación: la columna de la DB
 * tampoco lo hace, así que apellidos como "O'Brien" o "Saint-Denis" seguirían
 * siendo buscables tal cual se escriben.
 */
export function normalizeSearchQuery(query: string): string {
  return removeAccents(query.toLowerCase())
}
