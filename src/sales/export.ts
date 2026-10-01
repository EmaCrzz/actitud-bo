import { buildCsv, downloadCsv } from '@/lib/csv'
import type { SalesLedgerEntry } from './types'

interface ExportOptions {
  filename: string
  headers: {
    date: string
    buyer: string
    concept: string
    amount: string
    method: string
  }
  /** Las mismas funciones de etiqueta que usa la tabla, para que el CSV diga lo mismo. */
  buyerLabel: (entry: SalesLedgerEntry) => string
  conceptLabel: (entry: SalesLedgerEntry) => string
  methodLabel: (entry: SalesLedgerEntry) => string
  dateLabel: (entry: SalesLedgerEntry) => string
}

/**
 * Exporta las ventas **que se están viendo** a un CSV, cuotas incluidas.
 *
 * El diseño dibuja un modal con Desde / Hasta / Formato PDF. Se exporta directo,
 * igual que Gastos: el rango ya está en la barra de filtros —el modal lo pedía
 * dos veces— y un PDF sumaba una dependencia para un archivo que se abre en una
 * planilla. Ver ADR 20261001100524.
 */
export function buildSalesCsv(entries: SalesLedgerEntry[], options: ExportOptions): string {
  const { headers, buyerLabel, conceptLabel, methodLabel, dateLabel } = options

  return buildCsv([
    [headers.date, headers.buyer, headers.concept, headers.amount, headers.method],
    ...entries.map((entry) => [
      dateLabel(entry),
      buyerLabel(entry),
      conceptLabel(entry),
      String(entry.amount),
      methodLabel(entry),
    ]),
  ])
}

export function downloadSalesCsv(entries: SalesLedgerEntry[], options: ExportOptions): void {
  downloadCsv(buildSalesCsv(entries, options), options.filename)
}
