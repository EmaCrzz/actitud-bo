/**
 * Export a CSV generado en el browser. Lo usan Gastos (Fase 11) y Ventas (12).
 *
 * Se genera en el cliente y no en el server: son decenas de filas, no hace
 * falta ni una ruta nueva ni una dependencia. El costo es que el archivo sale
 * de la memoria del cliente, que es justo donde ya está el dato.
 *
 * **Los montos van crudos** (`20000`, no `$ 20.000`): el CSV se abre en una
 * planilla, y un número formateado con separador de miles entra como texto y
 * no se puede sumar. Eso lo decide cada caller al armar sus filas.
 */
export function buildCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')
}

/**
 * Comillas alrededor de toda celda con coma, comilla o salto de línea, y las
 * comillas internas duplicadas. Sin esto una descripción como
 * `Cambio de cables, 3 metros` parte la fila en dos columnas.
 */
export function escapeCsvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function downloadCsv(csv: string, filename: string): void {
  // BOM para que Excel en Windows lea los acentos: sin él "Categoría" y
  // "Mantenimiento" salen con caracteres rotos.
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
