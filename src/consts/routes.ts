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

// --- Rutas v2 ---
// La v2 vive bajo /v2/* y está gateada por el feature flag `v2_access`.
// Los segmentos [lang]/[tenant] los agrega el rewrite de next.config.ts, así
// que acá van sin prefijo, igual que las rutas v1.
export const V2 = '/v2' as const
export const V2_HOME = `${V2}/home` as const
export const V2_CUSTOMERS = `${V2}/customers` as const
export const V2_ATTENDANCE = `${V2}/attendance` as const
export const V2_MEMBERSHIPS = `${V2}/memberships` as const
export const V2_SALES = `${V2}/sales` as const
export const V2_EXPENSES = `${V2}/expenses` as const
export const V2_BALANCE = `${V2}/balance` as const
export const V2_SETTINGS = `${V2}/settings` as const
export const V2_SETTINGS_BUSINESS = `${V2_SETTINGS}/business` as const
export const V2_SETTINGS_MEMBERSHIPS = `${V2_SETTINGS}/memberships` as const
export const V2_SETTINGS_PROMOTIONS = `${V2_SETTINGS}/promotions` as const
export const V2_SETTINGS_USERS = `${V2_SETTINGS}/users` as const

export const ROUTES_V2 = {
  V2_ATTENDANCE,
  V2_BALANCE,
  V2_CUSTOMERS,
  V2_EXPENSES,
  V2_HOME,
  V2_MEMBERSHIPS,
  V2_SALES,
  V2_SETTINGS_BUSINESS,
  V2_SETTINGS_MEMBERSHIPS,
  V2_SETTINGS_PROMOTIONS,
  V2_SETTINGS_USERS,
}

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
