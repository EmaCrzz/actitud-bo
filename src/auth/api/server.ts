import { createClient } from '@/lib/supabase/server'
import { type UserProfile, type UserRole } from '@/auth/types'
import { hasPermission } from '@/auth/permissions'

// Obtener perfil del usuario
export async function getProfile(userId?: string): Promise<UserProfile | null> {
  if (!userId) return null
  const supabase = await createClient()
  const { data, error } = await supabase.from('profile').select('*').eq('auth_id', userId).single()

  if (error) {
    console.error('Error fetching profile:', error)

    return null
  }

  return data
}

export async function getCurrentUserRoles(): Promise<UserRole[]> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data: profile } = await supabase
    .from('profile')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  if (!profile) return []

  const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', profile.id)

  return roles?.map((r) => r.role as UserRole) || []
}

export async function requirePermission(
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete'
) {
  const roles = await getCurrentUserRoles()

  if (!hasPermission(roles, resource, action)) {
    throw new Error('Insufficient permissions')
  }

  return true
}
