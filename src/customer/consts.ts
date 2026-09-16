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
