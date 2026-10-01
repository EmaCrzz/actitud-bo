import type { Sale, SaleInput } from '../types'

const API_BASE = '/api/sales'

interface SaleResult {
  success: boolean
  data?: Sale | null
  error?: string
}

/**
 * Cliente de las rutas de `/api/sales`. Mismo contrato que el de Gastos: nunca
 * tira, devuelve `{ success: false }` y el panel decide qué mostrar.
 */
async function request(url: string, init: RequestInit): Promise<SaleResult> {
  try {
    const response = await fetch(url, init)
    const body = (await response.json().catch(() => null)) as SaleResult | null

    if (!response.ok) return { success: false, error: body?.error ?? `HTTP ${response.status}` }

    return body ?? { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error' }
  }
}

const json = (method: string, data: SaleInput): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
})

export const createSale = (data: SaleInput) => request(API_BASE, json('POST', data))

export const updateSale = (id: string, data: SaleInput) =>
  request(`${API_BASE}/${id}`, json('PUT', data))

export const deleteSale = (id: string) => request(`${API_BASE}/${id}`, { method: 'DELETE' })
