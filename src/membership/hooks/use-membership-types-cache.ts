'use client'

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Key de la caché del catálogo de planes.
 *
 * Estaba escrita como literal en cinco lugares —dos queries de v1, dos de v2 y
 * la invalidación del form de precios— y esa dispersión fue exactamente el
 * problema: la Fase 10 agregó una pantalla que **crea** planes y no invalidó
 * nada, así que el select de renovación seguía ofreciendo la lista vieja
 * durante los 5 minutos de `staleTime`. Ema lo encontró probando: creó un plan
 * y tuvo que recargar para verlo.
 *
 * La variante `v2` es un sufijo de la misma key a propósito: React Query
 * invalida **por prefijo**, así que invalidar `['membership-types']` alcanza
 * las cuatro queries de una.
 */
export const MEMBERSHIP_TYPES_QUERY_KEY = ['membership-types'] as const

/** La misma caché, para los consumidores de v2. Ver la nota sobre el prefijo. */
export const MEMBERSHIP_TYPES_QUERY_KEY_V2 = ['membership-types', 'v2'] as const

/**
 * Invalida el catálogo en las cuatro pantallas que lo consumen.
 *
 * **Llamarlo después de toda escritura sobre `types_memberships`.** Un
 * `router.refresh()` no alcanza: revalida el server component que trajo los
 * planes, pero los selects de alta y renovación los leen con React Query desde
 * el browser y esa caché queda intacta.
 */
export function useInvalidateMembershipTypes() {
  const queryClient = useQueryClient()

  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: MEMBERSHIP_TYPES_QUERY_KEY }),
    [queryClient]
  )
}
