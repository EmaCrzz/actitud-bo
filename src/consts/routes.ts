export const ACCOUNTING = '/accounting' as const
export const ACCOUNTING_TAB_ACCOUNTING = 'accounting' as const
export const ACCOUNTING_TAB_MEMBERSHIP = 'membership' as const
export const ASSISTANCES = '/assistances' as const
export const CUSTOMER = '/customer' as const
export const CUSTOMER_EDIT = '/customer/edit' as const
export const CUSTOMER_NEW = '/customer/new' as const
export const CUSTOMER_GROUPS = '/customer/groups' as const
export const CUSTOMER_GROUPS_NEW = '/customer/groups/new' as const
export const CUSTOMER_TAB_INDIVIDUALS = 'individuals' as const
export const CUSTOMER_TAB_GROUPS = 'groups' as const
export const CUSTOMER_LIST_GROUPS = `${CUSTOMER}?tab=${CUSTOMER_TAB_GROUPS}` as const
export const EXPENSES = '/expenses' as const
export const EXPENSES_NEW = '/expenses/new' as const
export const EXPENSES_EDIT = '/expenses/edit' as const
export const HOME = '/' as const
export const INCOMES = '/incomes' as const
export const LOGIN = '/login' as const
export const MEMBERSHIP = '/membership' as const
export const REGISTER_ASSISTANCE = '/register/assistance' as const
export const REGISTER_CUSTOMER = '/register/customer' as const
export const STATS = '/stats' as const

export const ROUTES = {
  ACCOUNTING,
  ASSISTANCES,
  CUSTOMER_EDIT,
  CUSTOMER_NEW,
  CUSTOMER,
  EXPENSES,
  HOME,
  INCOMES,
  LOGIN,
  MEMBERSHIP,
  REGISTER_ASSISTANCE,
  REGISTER_CUSTOMER,
  STATS,
}
