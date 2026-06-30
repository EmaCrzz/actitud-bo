export const EXPENSE_CATEGORIES = [
  'SERVICES',
  'MAINTENANCE',
  'EQUIPMENT',
  'SALARIES',
  'SUPPLIES',
  'RENT',
  'TAXES',
  'OTHER',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

// Migration map from old Spanish categories to new English ones
export const LEGACY_CATEGORY_MAP: Record<string, ExpenseCategory> = {
  'Servicios': 'SERVICES',
  'Mantenimiento': 'MAINTENANCE',
  'Equipamiento': 'EQUIPMENT',
  'Salarios': 'SALARIES',
  'Suministros': 'SUPPLIES',
  'Alquiler': 'RENT',
  'Impuestos': 'TAXES',
  'Otros': 'OTHER',
  // Also map uppercase Spanish versions
  'SERVICIOS': 'SERVICES',
  'MANTENIMIENTO': 'MAINTENANCE',
  'EQUIPAMIENTO': 'EQUIPMENT',
  'SALARIOS': 'SALARIES',
  'SUMINISTROS': 'SUPPLIES',
  'SUELDOS': 'SALARIES', // Alternative Spanish term
  'ALQUILER': 'RENT',
  'IMPUESTOS': 'TAXES',
  'OTROS': 'OTHER',
}

// Color mapping for category badges
export const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  SERVICES: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  MAINTENANCE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  EQUIPMENT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  SALARIES: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  SUPPLIES: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  RENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  TAXES: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  OTHER: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}
