export const ACTITUD = 'actitud'
export const CORE = 'core'
export const WELLRISE = 'wellrise'

export const TENANTS = {
  ACTITUD,
  CORE,
  WELLRISE,
}

export type TenantsType = (typeof TENANTS)[keyof typeof TENANTS]
