import { createClient } from '@/lib/supabase/client'
import { withRateLimit } from '@/lib/rate-limit'
import { DatabaseResult } from '@/types/database-errors'
import {
  CustomerGroup,
  CustomerGroupWithCount,
  CustomerGroupWithMembers,
  GroupMemberSummary,
} from '@/group/types'
import { GROUP_TYPE_FAMILY } from '@/group/consts'
import { getAppTzDateParts } from '@/lib/timezone'

// -------- Reads (cliente) --------
// Mismos shapes que las funciones server, pero corriendo en el browser para
// pantallas con React Query. Duplicamos el shape (no la lógica) porque el
// server usa `createClient` de `@/lib/supabase/server` y el cliente el de
// `@/lib/supabase/client` — distintos módulos, no compatibles.

async function _listGroupsWithCount(): Promise<CustomerGroupWithCount[]> {
  const supabase = createClient()
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

export const listGroupsWithCount = withRateLimit('search', _listGroupsWithCount)

async function _getGroupWithMembers(groupId: string): Promise<CustomerGroupWithMembers | null> {
  const supabase = createClient()
  const { data: group } = await supabase
    .from('customer_groups')
    .select('*')
    .eq('id', groupId)
    .single()

  if (!group) return null

  const { data: members } = await supabase
    .from('customer_group_members')
    .select(
      `
      id,
      customer_id,
      joined_at,
      customers ( first_name, last_name, customer_membership ( membership_type, expiration_date ) )
    `
    )
    .eq('group_id', groupId)
    .is('left_at', null)
    .order('joined_at', { ascending: true })

  const today = getAppTzDateParts()
  const todayKey = today.year * 10000 + today.month * 100 + today.day

  const memberSummaries: GroupMemberSummary[] = (members ?? []).map((m) => {
    const customer = m.customers as unknown as {
      first_name: string
      last_name: string
      customer_membership?: { membership_type: string; expiration_date: string | null }[]
    } | null
    const membership = customer?.customer_membership?.[0] ?? null

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

export const getGroupWithMembers = withRateLimit('search', _getGroupWithMembers)

// -------- Writes (mutations) --------

interface CreateGroupInput {
  name: string
  customerIds: string[]
}

// Crea el grupo y vincula los miembros iniciales.
// Requiere al menos 2 miembros — validación de negocio.
export async function createGroup({
  name,
  customerIds,
}: CreateGroupInput): Promise<DatabaseResult & { group?: CustomerGroup }> {
  const trimmedName = name.trim()

  if (!trimmedName) {
    return {
      success: false,
      error_code: 'MISSING_GROUP_NAME',
      message: 'El nombre del grupo es requerido',
      operation: 'create',
    }
  }

  if (customerIds.length < 2) {
    return {
      success: false,
      error_code: 'GROUP_MIN_MEMBERS',
      message: 'Un grupo familiar necesita al menos 2 integrantes',
      operation: 'create',
    }
  }

  const supabase = createClient()

  const { data: group, error: groupError } = await supabase
    .from('customer_groups')
    .insert({ name: trimmedName, type: GROUP_TYPE_FAMILY })
    .select()
    .single()

  if (groupError || !group) {
    return {
      success: false,
      error_code: 'UNEXPECTED_ERROR',
      message: `No se pudo crear el grupo${groupError ? `: ${groupError.message}` : ''}`,
      operation: 'create',
    }
  }

  const memberRows = customerIds.map((cid) => ({
    group_id: group.id,
    customer_id: cid,
  }))

  const { error: membersError } = await supabase.from('customer_group_members').insert(memberRows)

  if (membersError) {
    // Rollback: si falla la carga de miembros, borro el grupo recién creado.
    await supabase.from('customer_groups').delete().eq('id', group.id)

    return {
      success: false,
      error_code: 'UNEXPECTED_ERROR',
      message: `No se pudieron agregar los integrantes: ${membersError.message}`,
      operation: 'create',
    }
  }

  return {
    success: true,
    operation: 'created',
    message: 'Grupo familiar creado correctamente',
    data: null,
    group,
  }
}

export async function renameGroup(groupId: string, newName: string): Promise<DatabaseResult> {
  const trimmed = newName.trim()

  if (!trimmed) {
    return {
      success: false,
      error_code: 'MISSING_GROUP_NAME',
      message: 'El nombre del grupo es requerido',
      operation: 'update',
    }
  }

  const supabase = createClient()
  const { error } = await supabase
    .from('customer_groups')
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq('id', groupId)

  if (error) {
    return {
      success: false,
      error_code: 'UNEXPECTED_ERROR',
      message: `No se pudo renombrar: ${error.message}`,
      operation: 'update',
    }
  }

  return {
    success: true,
    operation: 'updated',
    message: 'Grupo actualizado',
    data: null,
  }
}

export async function addMember(groupId: string, customerId: string): Promise<DatabaseResult> {
  const supabase = createClient()
  const { error } = await supabase
    .from('customer_group_members')
    .insert({ group_id: groupId, customer_id: customerId })

  if (error) {
    // 23505 = unique_violation → el cliente ya está en el grupo.
    if (error.code === '23505') {
      return {
        success: false,
        error_code: 'MEMBER_ALREADY_IN_GROUP',
        message: 'El cliente ya pertenece a este grupo',
        operation: 'update',
      }
    }

    return {
      success: false,
      error_code: 'UNEXPECTED_ERROR',
      message: `No se pudo agregar: ${error.message}`,
      operation: 'update',
    }
  }

  return {
    success: true,
    operation: 'updated',
    message: 'Integrante agregado al grupo',
    data: null,
  }
}

// Baja lógica: setea left_at en vez de borrar la fila (preserva auditoría
// de pagos históricos con discount_rule_id apuntando al grupo).
export async function removeMember(memberId: string): Promise<DatabaseResult> {
  const supabase = createClient()
  const { error } = await supabase
    .from('customer_group_members')
    .update({ left_at: new Date().toISOString() })
    .eq('id', memberId)

  if (error) {
    return {
      success: false,
      error_code: 'UNEXPECTED_ERROR',
      message: `No se pudo quitar: ${error.message}`,
      operation: 'update',
    }
  }

  return {
    success: true,
    operation: 'updated',
    message: 'Integrante removido del grupo',
    data: null,
  }
}

// Baja hard del grupo. El ON DELETE CASCADE elimina también los members;
// los pagos con discount_rule_id conservan su referencia gracias al
// ON DELETE SET NULL (la regla sigue existiendo aunque el grupo no).
export async function deleteGroup(groupId: string): Promise<DatabaseResult> {
  const supabase = createClient()
  const { error } = await supabase.from('customer_groups').delete().eq('id', groupId)

  if (error) {
    return {
      success: false,
      error_code: 'UNEXPECTED_ERROR',
      message: `No se pudo eliminar el grupo: ${error.message}`,
      operation: 'update',
    }
  }

  return {
    success: true,
    operation: 'updated',
    message: 'Grupo eliminado',
    data: null,
  }
}
