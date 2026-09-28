import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getAdminCredentials } from './env'

/**
 * Acceso de lectura a la DB para los specs.
 *
 * La suite verifica por UI siempre que puede. Esto existe para el caso en que
 * la UI no alcanza: el bug de canonicalización de fechas (ver ADR
 * 20260709153000) no se ve en pantalla. Un `start_date` mandado crudo se guarda
 * tres horas antes del intent y puede caer en el mes contable anterior, pero el
 * panel dice "listo", el monto es correcto y el pago aparece en la lista.
 * Lo único que cambió es un timestamp que ninguna pantalla muestra.
 *
 * Se conecta como el mismo usuario admin de la suite —no con `service_role`—
 * así que lee exactamente lo que la app puede leer y las políticas de RLS
 * siguen vigentes.
 */
let cachedClient: SupabaseClient | null = null

export async function getDbClient(): Promise<SupabaseClient> {
  if (cachedClient) return cachedClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local.'
    )
  }

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { email, password } = getAdminCredentials()
  const { error } = await client.auth.signInWithPassword({ email, password })

  if (error) {
    throw new Error(`No se pudo autenticar contra Supabase para leer la DB: ${error.message}`)
  }

  cachedClient = client

  return client
}

export interface MembershipPaymentRow {
  id: string
  customer_id: string
  amount: number
  payment_date: string
  period_start: string
  membership_type: string
  payment_method: string
}

/**
 * Último pago de un cliente, buscándolo por DNI.
 *
 * Por DNI y no por id porque los specs crean el cliente a través de la UI y
 * nunca ven su id; el DNI es el dato que generan ellos mismos.
 */
export async function findLatestPaymentByPersonId(
  personId: string
): Promise<MembershipPaymentRow | null> {
  const client = await getDbClient()

  const { data: customer, error: customerError } = await client
    .from('customers')
    .select('id')
    .eq('person_id', personId)
    .maybeSingle()

  if (customerError) throw new Error(`Error buscando el cliente: ${customerError.message}`)
  if (!customer) return null

  const { data, error } = await client
    .from('membership_payments')
    .select('id, customer_id, amount, payment_date, period_start, membership_type, payment_method')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Error buscando el pago: ${error.message}`)

  return data as MembershipPaymentRow | null
}

export interface AssistanceRow {
  id: string
  assistance_date: string
}

/**
 * Última asistencia registrada de un cliente, buscándolo por DNI.
 *
 * La usa el spec de la sección Asistencias para lo único que la pantalla no
 * puede mostrar: en qué **día calendario argentino** cayó el timestamp que se
 * guardó. Que la fila aparezca en la lista de hoy ya prueba que el filtro por
 * rango funciona; esto prueba además que el valor guardado es el que se cree.
 */
export async function findLatestAssistanceByPersonId(
  personId: string
): Promise<AssistanceRow | null> {
  const client = await getDbClient()

  const { data: customer, error: customerError } = await client
    .from('customers')
    .select('id')
    .eq('person_id', personId)
    .maybeSingle()

  if (customerError) throw new Error(`Error buscando el cliente: ${customerError.message}`)
  if (!customer) return null

  const { data, error } = await client
    .from('assistance')
    .select('id, assistance_date')
    .eq('customer_id', customer.id)
    .order('assistance_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Error buscando la asistencia: ${error.message}`)

  return data as AssistanceRow | null
}

/** Cantidad de pagos registrados para un cliente. */
export async function countPaymentsByPersonId(personId: string): Promise<number> {
  const client = await getDbClient()

  const { data: customer } = await client
    .from('customers')
    .select('id')
    .eq('person_id', personId)
    .maybeSingle()

  if (!customer) return 0

  const { count, error } = await client
    .from('membership_payments')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customer.id)

  if (error) throw new Error(`Error contando pagos: ${error.message}`)

  return count ?? 0
}

export interface MembershipTypeRow {
  id: string
  type: string
  name: string | null
  amount: number | null
  amount_surcharge: number | null
  middle_amount: number | null
  weekly_quota: number | null
  active: boolean
}

/**
 * Un plan del catálogo, buscándolo por su nombre visible.
 *
 * Por nombre y no por `type` porque el formulario sólo pide el nombre: la
 * clave la deriva `membershipTypeKeyFromName`, y que esa derivación sea la
 * esperada es justamente una de las cosas que el spec verifica.
 */
export async function findMembershipTypeByName(name: string): Promise<MembershipTypeRow | null> {
  const client = await getDbClient()

  const { data, error } = await client
    .from('types_memberships')
    .select('id, type, name, amount, amount_surcharge, middle_amount, weekly_quota, active')
    .eq('name', name)
    .maybeSingle()

  if (error) throw new Error(`Error buscando el plan: ${error.message}`)

  return data as MembershipTypeRow | null
}
