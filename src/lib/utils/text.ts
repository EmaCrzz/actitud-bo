/**
 * Normalizes text by converting to lowercase, removing accents, and special characters
 * Useful for search functionality and text comparison
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s]/g, '') // Remove special characters
}