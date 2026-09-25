import type { SupabaseClient } from '@supabase/supabase-js'
import {
  DISCOUNT_APPLIES_TO_GROUP_MEMBER,
  DISCOUNT_TYPE_FIXED,
  DISCOUNT_TYPE_PERCENT,
  GROUP_MIN_MEMBERS_FOR_DISCOUNT,
} from '@/group/consts'
import type { ApplicableDiscount, DiscountRule } from '@/group/types'

/**
 * Monto que descuenta una regla sobre un bruto dado.
 *
 * Está separado de `resolveApplicableDiscount` porque el panel de renovación lo
 * necesita **sin volver a consultar**: el bruto cambia cada vez que el operador
 * toca el plan o la modalidad de cobro, y una regla `percent` da otro número
 * para cada uno. Refetchear por eso sería un round trip por click para
 * recalcular una multiplicación — y peor, dejaría el monto mostrado un render
 * atrasado respecto del total.
 *
 * Devuelve 0 para una regla `percent` sin bruto conocido: es preferible no
 * descontar nada a descontar un porcentaje de un número que no tenemos.
 */
export function computeDiscountAmount(
  rule: Pick<DiscountRule, 'type' | 'value'>,
  membershipGrossAmount: number | null
): number {
  if (rule.type === DISCOUNT_TYPE_FIXED) return rule.value
  if (rule.type === DISCOUNT_TYPE_PERCENT && membershipGrossAmount != null) {
    return Math.round(membershipGrossAmount * (rule.value / 100))
  }

  return 0
}

/**
 * Resolución del descuento aplicable a un cliente, **sin decidir de dónde sale
 * el cliente de Supabase**.
 *
 * Existe porque la Fase 8 necesita el mismo dato desde el browser. Vivía
 * entero en [src/group/api/server.ts], que empieza con `createClient()` del
 * server — y un client component no puede importar ese módulo. La alternativa
 * era reescribir las tres consultas y la aritmética del monto sugerido en
 * `api/client.ts`: dos copias de la regla de negocio que decide cuánta plata se
 * le descuenta a alguien, listas para divergir en el primer cambio de política.
 *
 * Así que la lógica quedó acá, parametrizada por el cliente, y los dos módulos
 * de API la envuelven. `api/server.ts` sigue siendo el punto de entrada del
 * server y `api/client.ts` el del browser; lo que comparten es esto.
 */
export async function resolveApplicableDiscount(
  supabase: SupabaseClient,
  customerId: string,
  membershipGrossAmount: number | null
): Promise<ApplicableDiscount | null> {
  const { data: memberships } = await supabase
    .from('customer_group_members')
    .select('group_id, customer_groups!inner ( id, name )')
    .eq('customer_id', customerId)
    .is('left_at', null)

  if (!memberships || memberships.length === 0) return null

  const groupIds = memberships.map((m) => m.group_id)

  const { data: allMembers } = await supabase
    .from('customer_group_members')
    .select('group_id')
    .in('group_id', groupIds)
    .is('left_at', null)

  const activeByGroup = new Map<string, number>()

  ;(allMembers ?? []).forEach((m) => {
    activeByGroup.set(m.group_id, (activeByGroup.get(m.group_id) ?? 0) + 1)
  })

  const eligibleGroup = memberships.find(
    (m) => (activeByGroup.get(m.group_id) ?? 0) >= GROUP_MIN_MEMBERS_FOR_DISCOUNT
  )

  if (!eligibleGroup) return null

  const { data: rules } = await supabase
    .from('discount_rules')
    .select('*')
    .eq('applies_to', DISCOUNT_APPLIES_TO_GROUP_MEMBER)
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(1)

  const rule = rules?.[0]

  if (!rule) return null

  const groupInfo = eligibleGroup.customer_groups as unknown as {
    id: string
    name: string
  }

  return {
    rule,
    group: {
      id: groupInfo.id,
      name: groupInfo.name,
      active_members_count: activeByGroup.get(eligibleGroup.group_id) ?? 0,
    },
    suggested_amount: computeDiscountAmount(rule, membershipGrossAmount),
  }
}
