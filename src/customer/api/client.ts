import { createClient } from '@/lib/supabase/client'
import { Customer, CustomerProfile } from '@/customer/types'
import { CUSTOMER_PROFILE, SEARCH_CUSTOMER } from '@/customer/consts'
import type { MembershipTypes } from '@/membership/consts'
import {
  fetchCustomersPageWith,
  type CustomersPage,
  type FetchCustomersPageOptions,
} from '@/customer/api/customers-query'
import { removeFormatPersonId } from '@/lib/format-person-id'
import { DatabaseResult } from '@/types/database-errors'
import { basicCustomerValidation, basicMembershipValidation } from '../utils'
import { withRateLimit } from '@/lib/rate-limit'
import { parseCurrency } from '@/lib/format-currency'
import { parseAppTzDateString } from '@/lib/timezone'
import { normalizeSearchQuery } from '@/lib/utils/text'

// Convierte la fecha del datepicker ("YYYY-MM-DD" o ISO con "T") al ISO
// timestamp que representa medianoche en la zona del negocio (Argentina).
// Sin esta canonicalización, Postgres interpreta el string como midnight UTC
// y el pago queda registrado como "día anterior 21hs AR" — el mes contable
// del pago se desalinea (bug histórico: 91 pagos afectados en 2 meses).
function isoDateToAppTzTimestamp(input: string | null | undefined): string | null {
  if (!input) return null
  const datePart = input.slice(0, 10)

  return parseAppTzDateString(datePart).toISOString()
}

// Función interna de búsqueda sin rate limiting
async function _searchCustomer(query?: string) {
  if (!query) return []
  const supabase = createClient()
  const { data } = await supabase
    .from('customers')
    .select(SEARCH_CUSTOMER)
    .ilike('full_name_search', `%${normalizeSearchQuery(query)}%`)
    .order('first_name', {
      ascending: true,
    })

  const customers: Customer[] =
    data?.map((customer) => {
      const membership_type = customer.customer_membership?.[0]?.membership_type || null

      return {
        ...customer,
        membership_type,
      }
    }) || []

  return customers
}

// Función exportada con rate limiting
export const searchCustomer = withRateLimit('search', _searchCustomer)

// Paginación + búsqueda server-side para el listado de clientes.
//
// Devuelve `{ customers, total }` en vez de sólo el array: el listado v2 pinta
// un paginador numerado y el contador "N Total de clientes", que necesitan el
// total. La forma paginada sirve igual a los dos modos de consumo — el listado
// v1 (`customer/list.tsx`) la sigue usando con `useInfiniteQuery` acumulando
// páginas, y el v2 la usa con página fija.
async function _fetchCustomersPage(
  options: FetchCustomersPageOptions & { page: number }
): Promise<CustomersPage> {
  return fetchCustomersPageWith(createClient(), options)
}

export const fetchCustomersPage = withRateLimit('search', _fetchCustomersPage)

/**
 * Datos del panel "Perfil del cliente" (Fase 6b).
 *
 * Se resuelve en el browser, igual que `fetchCustomerModalData` del modal de
 * asistencia: el panel se abre a demanda desde una fila, así que precargar el
 * perfil de las 20 filas de la página sería tirar 19 consultas a la basura.
 *
 * Las dos consultas van en paralelo aunque el precio dependa del tipo de
 * membresía: `types_memberships` son cinco filas, así que traerlas todas y
 * elegir en memoria sale más barato que encadenar un segundo round trip.
 *
 * El precio que muestra el panel es el **de lista del plan**, no el del último
 * pago. `membership_payments` es admin-only a nivel RLS
 * (20260702120000_finances_admin_only_rls), así que leer el monto real dejaría
 * la ficha sin precio para los no-admin; y "Precio" en la card de la membresía
 * es el del plan vigente, no el histórico de lo que se cobró.
 */
export async function fetchCustomerProfile(customerId: string): Promise<CustomerProfile | null> {
  const supabase = createClient()

  const [{ data: customer, error }, { data: types }] = await Promise.all([
    supabase.from('customers').select(CUSTOMER_PROFILE).eq('id', customerId).maybeSingle(),
    supabase.from('types_memberships').select('type, amount'),
  ])

  if (error) throw error
  if (!customer) return null

  const embedded = customer.customer_membership
  const membership = Array.isArray(embedded) ? (embedded[0] ?? null) : (embedded ?? null)
  const membershipType = (membership?.membership_type as MembershipTypes | undefined) ?? null

  return {
    id: customer.id,
    first_name: customer.first_name,
    last_name: customer.last_name,
    person_id: customer.person_id,
    phone: customer.phone,
    email: customer.email,
    birth_date: customer.birth_date,
    notes: customer.notes,
    assistance_count: customer.assistance_count ?? 0,
    created_at: customer.created_at,
    membership_type: membershipType,
    expiration_date: membership?.expiration_date ?? null,
    last_payment_date: membership?.last_payment_date ?? null,
    start_date: membership?.start_date ?? null,
    membership_amount:
      types?.find((type) => type.type === membershipType)?.amount ?? null,
  }
}

export async function checkCustomerPersonId({
  formData,
}: {
  formData: FormData
}): Promise<DatabaseResult & { enable: boolean }> {
  const { valid, errors } = basicCustomerValidation(formData)

  if (!valid) {
    return {
      enable: false,
      success: false,
      message: 'Por favor corrige los errores en el formulario',
      error_code: 'MISSING_REQUIRED_FIELDS',
      operation: 'check_data',
      data: errors,
    }
  }
  const personId = formData.get('person_id') as string
  const supabase = createClient()
  const { data, error } = await supabase
    .from('customers')
    .select()
    .eq('person_id', removeFormatPersonId(personId))

  if (error) {
    return {
      success: false,
      message: 'Ocurrió un error al verificar el DNI',
      error_code: 'UNEXPECTED_ERROR',
      operation: 'check_data',
      enable: false,
    }
  }

  if (data && data.length > 0) {
    // Si ya existe un cliente con este DNI, retornar el cliente encontrado
    return {
      error_code: 'PERSON_ID_ALREADY_EXISTS',
      data: { existing_customer: data[0] },
      enable: false,
      message: 'Ya existe un cliente con este DNI',
      operation: 'check_data',
      success: false,
    }
  }

  return {
    data,
    enable: data.length === 0,
    message: 'DNI disponible',
    operation: 'check_data',
    success: true,
  }
}

export async function updateCustomer({
  customerId,
  formData,
}: {
  customerId: string
  formData?: FormData
}): Promise<DatabaseResult> {
  const supabase = createClient()

  if (!formData) {
    return {
      success: false,
      message: 'No se recibieron datos del formulario',
      error_code: 'MISSING_FORM_DATA',
      operation: 'create',
    }
  }

  const firstName = formData.get('first_name') as string
  const lastName = formData.get('last_name') as string
  const personId = formData.get('person_id') as string
  const phone = formData.get('phone') as string
  const email = formData.get('email') as string

  const { data, error } = await supabase
    .from('customers')
    .update({
      first_name: firstName || null,
      last_name: lastName || null,
      person_id: removeFormatPersonId(personId) || null,
      phone: phone || null,
      email: email || null,
    })
    .eq('id', customerId)
    .select()
    .single()

  if (error) {
    return {
      success: false,
      message: 'Ocurrió un error al procesar la solicitud',
      error_code: 'UNEXPECTED_ERROR',
      operation: 'create',
    }
  }

  const customer = data as Customer

  return {
    success: true,
    operation: 'created',
    message: 'Cliente actualizado correctamente',
    data: { customer },
  }
}

interface UpsertCustomerParams {
  customerId?: string
  formDataCustomer?: FormData
  formDataMembership?: FormData
}

// Función interna para upsert sin rate limiting
async function _upsertCustomer({
  customerId,
  formDataCustomer,
  formDataMembership,
}: UpsertCustomerParams): Promise<DatabaseResult & { customer?: Customer }> {
  if (!formDataCustomer) {
    return {
      success: false,
      message: 'No se recibieron datos del formulario de cliente',
      error_code: 'MISSING_FORM_DATA',
      operation: 'create',
    }
  }
  if (!formDataMembership) {
    return {
      success: false,
      message: 'No se recibieron datos del formulario de membresía',
      error_code: 'MISSING_FORM_DATA',
      operation: 'create',
    }
  }

  // Extraer datos del formulario
  const firstName = formDataCustomer.get('first_name') as string
  const lastName = formDataCustomer.get('last_name') as string
  const personId = formDataCustomer.get('person_id') as string
  const phone = formDataCustomer.get('phone') as string
  const email = formDataCustomer.get('email') as string
  // `birth_date` y `notes` sólo las manda el alta v2 (Fase 7). El form de v1 no
  // tiene esos campos, así que llegan como null y el RPC los ignora vía COALESCE.
  const birthDate = formDataCustomer.get('birth_date') as string | null
  const notes = formDataMembership.get('notes') as string | null
  const membershipType = formDataMembership.get('membership_type') as string
  const firstAssistance = formDataMembership.get('first_assistance') as 'on' | null
  const startDate = formDataMembership.get('start_date') as string
  const endDate = formDataMembership.get('end_date') as string
  const startDateArTz = isoDateToAppTzTimestamp(startDate)
  const endDateArTz = isoDateToAppTzTimestamp(endDate)
  const payment = formDataMembership.get('payment') as 'on' | null
  const paymentType = formDataMembership.get('payment_type') as string
  const membershipAmount = formDataMembership.get('membership_amount') as string
  const isPaid = payment === 'on'
  const amount = isPaid ? parseCurrency(membershipAmount) : 0

  // Cuando hay cobro, la membresía la crea el paso 2 — no el paso 1.
  //
  // Los dos RPC son transacciones separadas: si el paso 1 crea la membresía y
  // el paso 2 falla, queda un cliente **con membresía activa y sin pago
  // registrado**. Nadie lo ve (el listado lo muestra al día) y el ingreso no
  // existe. Es el mismo perfil de falla silenciosa que las fechas sin
  // canonicalizar, y es justo el riesgo que la Fase 7 tenía que resolver.
  //
  // Difiriendo la membresía al paso 2 — que la crea igual, con su propio
  // INSERT ... ON CONFLICT — un fallo deja un cliente **sin membresía**: un
  // estado visible ("Sin membresía" en el listado), sin plata perdida y
  // arreglable desde la UI.
  //
  // Sólo aplica al camino con cobro. En el de "sólo primera asistencia"
  // (`first_assistance` sin `payment`) el paso 2 insertaría la membresía con
  // fechas nulas, porque no toma p_start_date/p_end_date cuando p_is_paid es
  // false — ahí el paso 1 tiene que seguir creándola.
  const deferMembershipToPaymentRpc = isPaid

  const supabase = createClient()

  // Paso 1: crear/actualizar customer y, si no hay cobro, inicializar también
  // customer_membership. El RPC `upsert_customer_with_membership` no registra
  // ingresos — esa es tarea del paso 2 (`upsert_customer_membership_with_payment`).
  const { data, error } = await supabase.rpc('upsert_customer_with_membership', {
    p_customer_id: customerId || null,
    p_first_name: firstName || null,
    p_last_name: lastName || null,
    p_person_id: removeFormatPersonId(personId) || null,
    p_phone: phone || null,
    p_email: email || null,
    // `birth_date` es una columna `date`, no `timestamptz`: se manda el
    // "YYYY-MM-DD" crudo a propósito. Canonicalizarlo con parseAppTzDateString
    // lo convertiría en un instante, y al castearlo de vuelta a `date` no
    // aportaría nada. La regla de timezone aplica a los timestamps del período
    // y del pago, que es donde el desfase de 3 horas cambia el mes contable.
    p_birth_date: birthDate || null,
    p_notes: notes || null,
    p_membership_type: deferMembershipToPaymentRpc ? null : membershipType,
    p_last_payment_date: deferMembershipToPaymentRpc ? null : startDateArTz,
    p_expiration_date: deferMembershipToPaymentRpc ? null : endDateArTz,
    p_start_date: deferMembershipToPaymentRpc ? null : startDateArTz,
  })

  if (error) {
    return {
      success: false,
      message: 'Ocurrió un error al procesar la solicitud',
      error_code: 'UNEXPECTED_ERROR',
      operation: customerId ? 'update' : 'create',
    }
  }

  const result = data as DatabaseResult

  if (!result.success) {
    return result
  }

  const newCustomerId = data?.customer?.id as string | undefined

  // Paso 2: si hay customer y datos de pago/asistencia, delegar al RPC bueno
  // (`upsert_customer_membership_with_payment`) para que registre el ingreso,
  // canonicalice expiration_date de daily como fin de día AR, y opcionalmente
  // registre la primera asistencia. Es el mismo RPC que usa el form de
  // "gestión de membresía" — así ambos flujos comparten la misma lógica.
  //
  // Los cuatro parámetros de descuento van explícitos aunque el alta no aplique
  // descuentos: son los que **seleccionan el overload de 14 parámetros**. Hasta
  // la Fase 7 esta llamada mandaba sólo los 10 base y caía en el overload
  // legacy, que escribía `COALESCE(p_payment_type, 'efectivo')` sin guarda —
  // y 'efectivo' viola el CHECK de membership_payments.payment_method, así que
  // un alta con cobro y forma de pago vacía reventaba con un 23514 críptico.
  // El overload de 14 corta antes con MISSING_PAYMENT_METHOD, que la UI sí sabe
  // traducir. El legacy queda sin llamadores y lo borra la migración
  // 20260918120100.
  const needsPaymentRpc = !!newCustomerId && (isPaid || firstAssistance === 'on')

  if (needsPaymentRpc) {
    const { data: paymentData, error: paymentError } = await supabase.rpc(
      'upsert_customer_membership_with_payment',
      {
        p_customer_id: newCustomerId,
        p_membership_type: membershipType,
        p_start_date: isPaid ? startDateArTz : null,
        p_end_date: isPaid ? endDateArTz : null,
        p_is_paid: isPaid,
        p_payment_type: paymentType || null,
        p_amount: amount,
        p_register_assistance: firstAssistance === 'on',
        p_type_change_action: null,
        p_adjustment_amount: null,
        // Bruto = neto: el alta cobra el precio de lista del plan según la
        // modalidad elegida, sin descuentos. El descuento por grupo familiar no
        // aplica acá — un cliente recién creado todavía no pertenece a ningún
        // grupo — y se registra después, en la renovación.
        p_gross_amount: isPaid ? amount : null,
        p_discount_amount: 0,
        p_discount_rule_id: null,
        p_discount_note: null,
      }
    )

    if (paymentError) {
      return {
        success: false,
        message: `Cliente creado, pero falló el registro del pago/asistencia: ${paymentError.message}`,
        error_code: 'RPC_ERROR',
        operation: 'update',
      }
    }

    const paymentResult = paymentData as DatabaseResult

    if (paymentResult && !paymentResult.success) {
      return paymentResult
    }
  }

  return result
}

// Función exportada con rate limiting
export const upsertCustomer = withRateLimit('createCustomer', _upsertCustomer)

export async function upsertCustomerMembership({
  customerId,
  formData,
}: {
  customerId: string
  formData?: FormData
}): Promise<DatabaseResult> {
  if (!formData) {
    return {
      success: false,
      message: 'No se recibieron datos del formulario',
      error_code: 'MISSING_FORM_DATA',
      operation: 'create',
    }
  }

  const { errors, valid } = basicMembershipValidation(formData)

  if (!valid) {
    return {
      success: false,
      error_code: 'MISSING_REQUIRED_FIELDS',
      message: 'Por favor corrige los errores en el formulario',
      operation: 'update',
      data: errors,
    }
  }

  const supabase = createClient()
  const startDate = formData.get('start_date') as string
  const endDate = formData.get('end_date') as string
  const startDateArTz = isoDateToAppTzTimestamp(startDate)
  const endDateArTz = isoDateToAppTzTimestamp(endDate)
  const membershipType = formData.get('membership_type') as string
  const payment = formData.get('payment') as 'on' | null
  const paymentType = formData.get('payment_type') as string
  const membershipAmount = formData.get('membership_amount') as string
  const firstAssistance = formData.get('first_assistance') as 'on' | null
  const typeChangeAction = formData.get('type_change_action') as 'refund' | 'charge_diff' | null
  const adjustmentAmountRaw = formData.get('adjustment_amount') as string | null
  // Campos de descuento: opcionales. Si no vienen, el RPC asume bruto = neto
  // y sin descuento (compatibilidad hacia atrás).
  const discountAmountRaw = formData.get('discount_amount') as string | null
  const discountRuleId = (formData.get('discount_rule_id') as string) || null
  const discountNoteRaw = formData.get('discount_note') as string | null

  const isPaid = payment === 'on'
  const grossAmount = isPaid ? parseCurrency(membershipAmount) : 0
  const discountAmount = discountAmountRaw ? parseCurrency(discountAmountRaw) : 0
  const netAmount = Math.max(0, grossAmount - discountAmount)
  const discountNote = discountNoteRaw?.trim() || null
  const adjustmentAmount =
    typeChangeAction && adjustmentAmountRaw ? parseCurrency(adjustmentAmountRaw) : null

  // Call the RPC function to handle all operations atomically
  const { data, error } = await supabase.rpc('upsert_customer_membership_with_payment', {
    p_customer_id: customerId,
    p_membership_type: membershipType,
    p_start_date: isPaid ? startDateArTz : null,
    p_end_date: isPaid ? endDateArTz : null,
    p_is_paid: isPaid,
    p_payment_type: paymentType || null,
    p_amount: netAmount,
    p_register_assistance: firstAssistance === 'on',
    p_type_change_action: typeChangeAction,
    p_adjustment_amount: adjustmentAmount,
    p_gross_amount: grossAmount,
    p_discount_amount: discountAmount,
    p_discount_rule_id: discountRuleId,
    p_discount_note: discountNote,
  })

  // Handle Supabase/PostgreSQL errors
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Supabase RPC error:', error)

    return {
      success: false,
      message: `Error al procesar la solicitud: ${error.message}`,
      error_code: 'RPC_ERROR',
      operation: 'update',
      data: {
        hint: error.hint,
        details: error.details,
      },
    }
  }

  // The RPC function returns a JSON object with the result
  const result = data as DatabaseResult

  // Check if the RPC function itself returned an error
  if (!result || !result.success) {
    // eslint-disable-next-line no-console
    console.error('RPC function returned error:', result)

    return (
      result || {
        success: false,
        message: 'La operación no se completó correctamente',
        error_code: 'OPERATION_FAILED',
        operation: 'update',
      }
    )
  }

  return result
}
