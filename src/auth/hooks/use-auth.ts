'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { UserProfile, UserRole } from '@/auth/types'
import { createClient } from '@/lib/supabase/client'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [roles, setRoles] = useState<UserRole[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    // Obtener usuario actual
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      setUser(user)

      if (user) {
        // Obtener perfil
        const { data: profileData } = await supabase
          .from('profile')
          .select('*')
          .eq('auth_id', user.id)
          .single()

        setProfile(profileData)

        if (profileData) {
          // Obtener roles
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profileData.id)

          setRoles(rolesData?.map((r) => r.role as UserRole) || [])
        }
      }

      setLoading(false)
    }

    getUser()

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setRoles([])
      } else if (session?.user) {
        setUser(session.user)
        // Recargar perfil y roles cuando cambie la sesión
        getUser()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return {
    user,
    profile,
    roles,
    loading,
    isAuthenticated: !!user,
  }
}
