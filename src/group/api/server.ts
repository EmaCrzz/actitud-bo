import { createClient } from '@/lib/supabase/server'
import {
  ApplicableDiscount,
  CustomerGroup,
  CustomerGroupWithCount,
  CustomerGroupWithMembers,
  GroupMemberSummary,
} from '@/group/types'
import {
  DISCOUNT_APPLIES_TO_GROUP_MEMBER,
  DISCOUNT_TYPE_FIXED,
  DISCOUNT_TYPE_PERCENT,
  GROUP_MIN_MEMBERS_FOR_DISCOUNT,
} from '@/group/consts'
import { getAppTzDateParts } from '@/lib/timezone'

// Grupos activos a los que pertenece un cliente, con el conteo de miembros
// activos de cada grupo (usado por el badge en la ficha).
export async function getGroupsByCustomer(customerId: string): Promise<CustomerGroupWithCount[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('customer_group_members')
    .select('customer_groups(*)')
    .eq('customer_id', customerId)
    .is('left_at', null)

  if (error || !data || data.length === 0) return []

  const groups = data
    .map((row) => (row.customer_groups as unknown as CustomerGroup) ?? null)
    .filter((g): g is CustomerGroup => g !== null)

  if (groups.length === 0) return []

  // Contamos miembros activos de todos los grupos en una sola query.
  const groupIds = groups.map((g) => g.id)
  const { data: counts } = await supabase
    .from('customer_group_members')
    .select('group_id')
    .in('group_id', groupIds)
    .is('left_at', null)

  const countByGroup = new Map<string, number>()

  ;(counts ?? []).forEach((c) => {
    countByGroup.set(c.group_id, (countByGroup.get(c.group_id) ?? 0) + 1)
  })

  return groups.map((g) => ({
    ...g,
    active_members_count: countByGroup.get(g.id) ?? 0,
  }))
}

// Listado de grupos con conteo de miembros activos (tab "Grupos" del listado).
export async function listGroupsWithCount(): Promise<CustomerGroupWithCount[]> {
  const supabase = await createClient()
  const { data: groups } = await supabase
    .from('customer_groups')
    .select('*')
    .order('name', { ascending: true })

  if (!groups) return []

  const { data: members } = await supabase
    .from('customer_group_members')
    .select('group_id')
    .is('left_at', null)

  const countByGroup = new Map<string, number>()

  ;(members ?? []).forEach((m) => {
    countByGroup.set(m.group_id, (countByGroup.get(m.group_id) ?? 0) + 1)
  })

  return groups.map((g) => ({
    ...g,
    active_members_count: countByGroup.get(g.id) ?? 0,
  }))
}

// Detalle de un grupo con sus integrantes activos, membresía y vencimiento.
export async function getGroupWithMembers(
  groupId: string
): Promise<CustomerGroupWithMembers | null> {
  const supabase = await createClient()
  const { data: group, error } = await supabase
    .from('customer_groups')
    .select('*')
    .eq('id', groupId)
    .single()

  if (error || !group) return null

  const { data: members } = await supabase
    .from('customer_group_members')
    .select(
      `
      id,
      customer_id,
      joined_at,
      customers ( first_name, last_name ),
      customer_membership:customers ( customer_membership ( membership_type, expiration_date ) )
    `
    )
    .eq('group_id', groupId)
    .is('left_at', null)
    .order('joined_at', { ascending: true })

  const today = getAppTzDateParts()
  const todayKey = today.year * 10000 + today.month * 100 + today.day

  const memberSummaries: GroupMemberSummary[] = (members ?? []).map((m) => {
    const customer = m.customers as unknown as { first_name: string; last_name: string } | null
    // Supabase collapsa la relación anidada — extraemos con casting seguro.
    const membershipContainer = m.customer_membership as unknown as {
      customer_membership?: { membership_type: string; expiration_date: string | null }[]
    } | null
    const membership = membershipContainer?.customer_membership?.[0] ?? null

    let isExpired = false

    if (membership?.expiration_date) {
      const expParts = getAppTzDateParts(new Date(membership.expiration_date))
      const expKey = expParts.year * 10000 + expParts.month * 100 + expParts.day

      isExpired = expKey < todayKey
    } else if (membership) {
      isExpired = true
    }

    return {
      member_id: m.id,
      customer_id: m.customer_id,
      first_name: customer?.first_name ?? '',
      last_name: customer?.last_name ?? '',
      joined_at: m.joined_at,
      membership_type: (membership?.membership_type ??
        null) as GroupMemberSummary['membership_type'],
      expiration_date: membership?.expiration_date ?? null,
      is_expired: isExpired,
    }
  })

  return {
    ...group,
    members: memberSummaries,
  }
}

// Descuento aplicable al cliente ahora mismo. Devuelve la primera regla
// activa `group_member` cuyo grupo tenga >= GROUP_MIN_MEMBERS_FOR_DISCOUNT
// miembros activos. Si no hay match, null.
export async function getApplicableDiscountForCustomer(
  customerId: string,
  membershipGrossAmount: number | null
): Promise<ApplicableDiscount | null> {
  const supabase = await createClient()

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

  const suggestedAmount =
    rule.type === DISCOUNT_TYPE_FIXED
      ? rule.value
      : rule.type === DISCOUNT_TYPE_PERCENT && membershipGrossAmount != null
        ? Math.round(membershipGrossAmount * (rule.value / 100))
        : 0

  return {
    rule,
    group: {
      id: groupInfo.id,
      name: groupInfo.name,
      active_members_count: activeByGroup.get(eligibleGroup.group_id) ?? 0,
    },
    suggested_amount: suggestedAmount,
  }
}
