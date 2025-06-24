"use client"

import { useAuth } from "./use-auth"
import { hasPermission } from "@/auth/permissions"
import type { UserRole } from "@/auth/types"

export function usePermissions() {
  const { roles, loading } = useAuth()

  const checkPermission = (resource: string, action: "create" | "read" | "update" | "delete") => {
    if (loading) return false
    return hasPermission(roles, resource, action)
  }

  const hasRole = (role: UserRole) => {
    return roles.includes(role)
  }

  const hasAnyRole = (requiredRoles: UserRole[]) => {
    return requiredRoles.some((role) => roles.includes(role))
  }

  return {
    checkPermission,
    hasRole,
    hasAnyRole,
    roles,
    loading,
    isAdmin: hasRole("admin"),
    isManager: hasRole("manager"),
    isEmployee: hasRole("employee"),
  }
}
