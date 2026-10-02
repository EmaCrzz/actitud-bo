type Language = 'es' | 'en'

interface FormatCurrencyOptions {
  lang?: Language
  decimals?: number
  withSymbol?: boolean
}

export function formatCurrency(
  amount: number,
  { lang = 'es', decimals = 0, withSymbol = true }: FormatCurrencyOptions = {}
): string {
  const locale = lang === 'es' ? 'es-ES' : 'en-US'
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)

  if (withSymbol) {
    return `$ ${formatted}`
  }

  return formatted
}

/**
 * Parse a formatted currency string to a number
 * Handles both Spanish (1.500,00) and English (1,500.00) formats
 * @param value - The formatted currency string
 * @returns The parsed number or 0 if invalid
 */
export function parseCurrency(value: string | number): number {
  if (typeof value === 'number') return value
  if (!value) return 0

  // Remove currency symbols and spaces
  let cleaned = value.toString().replace(/[$\s]/g, '')

  // Detect format based on last separator
  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')

  if (lastComma > lastDot) {
    // Spanish format: 1.500,00
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  } else {
    // English format: 1,500.00
    cleaned = cleaned.replace(/,/g, '')
  }

  const parsed = parseFloat(cleaned)

  return isNaN(parsed) ? 0 : parsed
}

/**
 * Monto abreviado para ejes y etiquetas de gráficos: `$ 1,5 M`, `$ 500 mil`.
 *
 * Sólo para donde el monto exacto vive en otro lado (tooltip, tabla): un eje
 * con `$ 1.934.400` no entra, y redondeado a la unidad no le sirve a nadie.
 */
export function formatCompactCurrency(amount: number, { lang = 'es' }: { lang?: Language } = {}) {
  const locale = lang === 'es' ? 'es-ES' : 'en-US'
  const formatted = new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)

  return `$ ${formatted}`
}
