export interface FormatDateOptions {
  format?: 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd' | 'dd-mm-yyyy' | 'dd/MM/yyyy'
  locale?: string
}

export function formatDate(
  date: Date | string,
  { format = 'dd/mm/yyyy' }: FormatDateOptions = {}
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date provided')
  }

  const day = dateObj.getDate().toString().padStart(2, '0')
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
  const year = dateObj.getFullYear().toString()

  switch (format) {
    case 'dd/mm/yyyy':
      return `${day}/${month}/${year}`
    case 'mm/dd/yyyy':
      return `${month}/${day}/${year}`
    case 'yyyy-mm-dd':
      return `${year}-${month}-${day}`
    case 'dd-mm-yyyy':
      return `${day}-${month}-${year}`
    case 'dd/MM/yyyy':
      return `${day}/${month}/${year}`
    default:
      return `${day}/${month}/${year}`
  }
}

/**
 * Get current month in YYYY-MM format
 * @returns Current month string (e.g., '2025-10')
 */
export function getCurrentMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')

  return `${year}-${month}`
}
