export type UserRole = 'admin' | 'manager' | 'employee' | 'viewer'

export interface UserProfile {
  id: string
  auth_id: string
  first_name: string | null
  last_name: string | null
  picture: string | null
}

export interface UserRoleData {
  id: string
  user_id: string
  role: UserRole
  created_at: string
}

export interface Permission {
  resource: string
  action: 'create' | 'read' | 'update' | 'delete'
  roles: UserRole[]
}
