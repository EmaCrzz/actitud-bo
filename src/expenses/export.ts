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
 * distinto.
 *
 * Se genera en el browser y no en el server: son decenas de filas, no hace
 * falta ni una ruta nueva ni una dependencia. El costo es que el archivo sale
 * de la memoria del cliente, que es justo donde ya está el dato.
 *
 * **El monto va crudo** (`20000`, no `$ 20.000`): el CSV se abre en una
 * planilla y un número formateado con separador de miles entra como texto y no
 * se puede sumar. Lo demás va con la misma etiqueta que la tabla.
 */
export function buildExpensesCsv(expenses: Expense[], options: ExportOptions): string {
  const { headers, categoryLabel, methodLabel, dateLabel } = options

  const rows = [
    [headers.date, headers.category, headers.description, headers.amount, headers.method],
    ...expenses.map((expense) => [
      dateLabel(expense),
      categoryLabel(expense),
      expense.description ?? '',
      String(expense.amount ?? 0),
      methodLabel(expense),
    ]),
  ]

  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')
}

/**
 * Comillas alrededor de toda celda con coma, comilla o salto de línea, y las
 * comillas internas duplicadas. Sin esto una descripción como
 * `Cambio de cables, 3 metros` parte la fila en dos columnas.
 */
function escapeCsvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function downloadExpensesCsv(expenses: Expense[], options: ExportOptions): void {
  const csv = buildExpensesCsv(expenses, options)
  // BOM para que Excel en Windows lea los acentos: sin él "Categoría" y
  // "Mantenimiento" salen con caracteres rotos.
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = options.filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
