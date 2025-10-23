// Accounting domain constants

export const PAYMENT_METHODS = ['efectivo', 'transferencia', 'tarjeta', 'paypal', 'otro'] as const

export const EXPENSE_CATEGORIES = [
  'alquiler',
  'servicios',
  'equipos',
  'mantenimiento',
  'marketing',
  'personal',
  'suministros',
  'seguros',
  'impuestos',
  'otro',
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  paypal: 'PayPal',
  otro: 'Otro',
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  alquiler: 'Alquiler',
  servicios: 'Servicios',
  equipos: 'Equipos',
  mantenimiento: 'Mantenimiento',
  marketing: 'Marketing',
  personal: 'Personal',
  suministros: 'Suministros',
  seguros: 'Seguros',
  impuestos: 'Impuestos',
  otro: 'Otro',
}

export const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'efectivo'
