import type { UserRole, Permission } from "@/auth/types"

// Definir permisos por recurso y acción
export const PERMISSIONS: Permission[] = [
  // Customers
  { resource: "customers", action: "read", roles: ["admin", "manager", "employee", "viewer"] },
  { resource: "customers", action: "create", roles: ["admin", "manager"] },
  { resource: "customers", action: "update", roles: ["admin", "manager"] },
  { resource: "customers", action: "delete", roles: ["admin"] },

  // Memberships
  { resource: "memberships", action: "read", roles: ["admin", "manager", "employee", "viewer"] },
  { resource: "memberships", action: "create", roles: ["admin", "manager"] },
  { resource: "memberships", action: "update", roles: ["admin", "manager"] },
  { resource: "memberships", action: "delete", roles: ["admin"] },

  // Assistance
  { resource: "assistance", action: "read", roles: ["admin", "manager", "employee", "viewer"] },
  { resource: "assistance", action: "create", roles: ["admin", "manager", "employee"] },
  { resource: "assistance", action: "update", roles: ["admin", "manager"] },
  { resource: "assistance", action: "delete", roles: ["admin"] },

  // Admin panel
  { resource: "admin", action: "read", roles: ["admin"] },
  { resource: "users", action: "read", roles: ["admin"] },
  { resource: "users", action: "update", roles: ["admin"] },
]

export function hasPermission(
  userRoles: UserRole[],
  resource: string,
  action: "create" | "read" | "update" | "delete",
): boolean {
  const permission = PERMISSIONS.find((p) => p.resource === resource && p.action === action)

  if (!permission) return false

  return userRoles.some((role) => permission.roles.includes(role))
}

export function getHighestRole(roles: UserRole[]): UserRole {
  const roleHierarchy: UserRole[] = ["viewer", "employee", "manager", "admin"]

  for (let i = roleHierarchy.length - 1; i >= 0; i--) {
    if (roles.includes(roleHierarchy[i])) {
      return roleHierarchy[i]
    }
  }

  return "viewer"
}
