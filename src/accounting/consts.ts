// Accounting domain constants

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

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

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
