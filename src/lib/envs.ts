const SUPABASE_URL = String(process.env.NEXT_PUBLIC_SUPABASE_URL || '')
const SUPABASE_ANON_KEY = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
const TENANT = String(process.env.TENANT || '')
const ENV_DEVELOPMENT = String(process.env.NODE_ENV) === 'development'

export { SUPABASE_URL, SUPABASE_ANON_KEY, TENANT, ENV_DEVELOPMENT }
