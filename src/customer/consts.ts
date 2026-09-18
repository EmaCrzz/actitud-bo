const CUSTOMER_COLUMNS = `
  id,
  first_name,
  last_name,
  person_id,
  email,
  phone,
  created_at,
  assistance_count
`

// La membresía se embebe para que el listado pueda mostrar tipo, vencimiento y
// badge de estado sin una segunda consulta.
//
// Hay dos variantes porque PostgREST sólo permite **filtrar** por columnas de un
// recurso embebido cuando el join es `!inner`. Sin filtros queremos el left join
// (los clientes sin fila en `customer_membership` también son clientes y tienen
// que aparecer); con filtro de estado o de tipo, el inner es obligatorio.
export const SEARCH_CUSTOMER = `
  ${CUSTOMER_COLUMNS},
  customer_membership (membership_type, expiration_date)
` as const

export const SEARCH_CUSTOMER_WITH_MEMBERSHIP = `
  ${CUSTOMER_COLUMNS},
  customer_membership!inner (membership_type, expiration_date)
` as const

export const CUSTOMERS_PAGE_SIZE = 20

/**
 * Relación que se consulta para el listado: la **vista**, no la tabla.
 *
 * `customers_listing` es `customers` más el booleano `is_recently_active`, que
 * es la clave de orden primaria. El corte depende de `now()`, así que no puede
 * ser una columna generada y se calcula al leer. La vista tiene
 * `security_invoker = true`: hereda las policies RLS de `customers`.
 */
export const CUSTOMERS_LISTING_RELATION = 'customers_listing'

/**
 * Ventana que define "cliente con actividad reciente", en días.
 *
 * **Está duplicada en la definición SQL de la vista** (migración
 * `20260916183000`) porque Postgres tiene que evaluarla para ordenar y la app
 * para explicar el corte. Si se cambia, se cambia en los dos lados.
 */
export const ACTIVE_CUSTOMER_WINDOW_DAYS = 30

// Select del Perfil del cliente (panel lateral de la Fase 6b). Pide más columnas
// que el listado porque el tab "Info" muestra DNI, nacimiento, teléfono y
// observaciones, y el tab "Membresía" necesita `last_payment_date` para dibujar
// la barra de progreso del período.
//
// Es un select aparte y no una ampliación de SEARCH_CUSTOMER a propósito: el
// listado trae hasta 20 filas por página y no tiene por qué arrastrar el texto
// libre de `notes` de cada una.
export const CUSTOMER_PROFILE = `
  id,
  first_name,
  last_name,
  person_id,
  phone,
  email,
  birth_date,
  notes,
  assistance_count,
  created_at,
  customer_membership (membership_type, expiration_date, last_payment_date, start_date)
` as const
