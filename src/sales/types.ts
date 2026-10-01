/**
 * Una venta de producto: una fila de `public.sales` (migración 20261001100524).
 *
 * **Las cuotas de membresía no son `Sale`.** Viven en `membership_payments` y
 * la sección las une al leer — ver `SalesLedgerEntry`.
 */
export interface Sale {
  id: string
  /** NULL = venta a alguien que no es cliente. */
  customer_id: string | null
  /** "Datos de referencia". Sólo sin cliente, y opcional aun así. */
  buyer_name: string | null
  /** "Detalle de la venta": el producto, tipeado libre. */
  description: string
  amount: number
  payment_method: string
  /** Medianoche AR del día de la venta. */
  sale_date: string
  created_at: string
  updated_at: string
  customer?: {
    first_name: string
    last_name: string
  } | null
}

/**
 * Lo que el formulario manda para crear o editar una venta.
 *
 * `sale_date` viaja como "YYYY-MM-DD", tal cual sale del datepicker, y **lo
 * canonicaliza el server** — mismo contrato que `expense_date`. Mandarlo ya
 * convertido sería canonicalizarlo dos veces.
 */
export interface SaleInput {
  customer_id: string | null
  buyer_name: string | null
  description: string
  amount: number
  payment_method: string
  sale_date: string
}

export const SALE_KIND_MEMBERSHIP = 'membership' as const
export const SALE_KIND_PRODUCT = 'product' as const

export type SaleKind = typeof SALE_KIND_MEMBERSHIP | typeof SALE_KIND_PRODUCT

interface LedgerEntryBase {
  /** Único entre las dos tablas: los `id` de cada una podrían repetirse. */
  key: string
  /** La fecha contable: `payment_date` de la cuota, `sale_date` del producto. */
  date: string
  /** Desempata dentro de un mismo día. Ver `compareLedgerEntries`. */
  createdAt: string
  amount: number
  paymentMethod: string
  customerId: string | null
  /**
   * Nombre de quien pagó: el del cliente, o los "Datos de referencia" de una
   * venta sin cliente. `null` sólo en una venta sin cliente que no los cargó.
   */
  buyerName: string | null
}

/** Una cuota cobrada. **Sólo lectura** en Ventas: se cobra por la renovación. */
export interface MembershipLedgerEntry extends LedgerEntryBase {
  kind: typeof SALE_KIND_MEMBERSHIP
  membershipType: string
  /** NULL en los 5 planes del catálogo, que resuelven su etiqueta por i18n. */
  planName: string | null
  /**
   * Descuento y recargo de la cuota. `amount` ya los incluye (es el neto); los
   * lee el Balance para mostrar cuánto se dejó de cobrar y cuánto se cobró de
   * más contra el precio de lista.
   */
  discountAmount: number
  surchargeAmount: number
  /** Cupo semanal del plan (5, 3, 2, 1 para el pase diario). NULL si no se sabe. */
  weeklyQuota: number | null
}

export interface ProductLedgerEntry extends LedgerEntryBase {
  kind: typeof SALE_KIND_PRODUCT
  description: string
  /** La fila original, para abrir el panel de edición. */
  sale: Sale
}

/**
 * Una fila del listado de Ventas: **todo lo que se cobró**, cuotas y productos.
 *
 * Cada peso vive en una sola tabla —cuotas en `membership_payments`, productos
 * en `sales`— y esta unión existe sólo en memoria. Ver ADR 20261001100524.
 */
export type SalesLedgerEntry = MembershipLedgerEntry | ProductLedgerEntry
