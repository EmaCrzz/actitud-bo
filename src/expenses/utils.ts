import type { ExpenseCategory } from './consts'
import type { TranslationKey } from '@/lib/i18n/types'
import { LEGACY_CATEGORY_MAP } from './consts'

export function getCategoryTranslationKey(
  category: ExpenseCategory
): `accounting.expenses.categories.${ExpenseCategory}` {
  return `accounting.expenses.categories.${category}`
}

export function isValidExpenseCategory(category: string): category is ExpenseCategory {
  const validCategories = [
    'SERVICES',
    'MAINTENANCE',
    'EQUIPMENT',
    'SALARIES',
    'SUPPLIES',
    'RENT',
    'TAXES',
    'OTHER',
  ]

  return validCategories.includes(category)
}

/**
 * Normalizes legacy Spanish categories to new English constants
 */
export function normalizeCategoryValue(category: string): ExpenseCategory {
  // If already a valid category, return as is
  if (isValidExpenseCategory(category)) {
    return category
  }

  // Try to map from legacy Spanish name
  const normalized = LEGACY_CATEGORY_MAP[category]
  if (normalized) {
    return normalized
  }

  // Fallback to OTHER if unknown
  return 'OTHER'
}
