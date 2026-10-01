import { buildCsv, downloadCsv } from '@/lib/csv'
import type { Expense } from '@/accounting/types'

interface ExportOptions {
  filename: string
  headers: {
    category: string
    amount: string
    description: string
    date: string
    method: string
  }
  /** Las mismas funciones de etiqueta que usa la tabla, para que el CSV diga lo mismo. */
  categoryLabel: (expense: Expense) => string
  methodLabel: (expense: Expense) => string
  dateLabel: (expense: Expense) => string
}

/**
 * Exporta los gastos **que se están viendo** a un CSV.
 *
 * Recibe la lista ya filtrada por la misma razón que `summarizeExpenses`:
 * exportar tiene que dar exactamente lo que la pantalla muestra, y una segunda
 * consulta con los mismos filtros es una segunda oportunidad de interpretarlos
 * distinto. El escape y la descarga viven en `@/lib/csv`.
 */
export function buildExpensesCsv(expenses: Expense[], options: ExportOptions): string {
  const { headers, categoryLabel, methodLabel, dateLabel } = options

  return buildCsv([
    [headers.date, headers.category, headers.description, headers.amount, headers.method],
    ...expenses.map((expense) => [
      dateLabel(expense),
      categoryLabel(expense),
      expense.description ?? '',
      String(expense.amount ?? 0),
      methodLabel(expense),
    ]),
  ])
}

export function downloadExpensesCsv(expenses: Expense[], options: ExportOptions): void {
  downloadCsv(buildExpensesCsv(expenses, options), options.filename)
}
