"use client"

import type React from "react"

import { useAuth } from "@/auth/hooks/use-auth"
import { usePermissions } from "@/auth/hooks/use-permissions"
import type { UserRole } from "@/auth/types"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: UserRole[]
  resource?: string
  action?: "create" | "read" | "update" | "delete"
  fallback?: React.ReactNode
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  requiredRoles,
  resource,
  action,
  fallback,
  redirectTo = "/unauthorized",
}: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth()
  const { hasAnyRole, checkPermission } = usePermissions()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login")

      return
    }

    if (!loading && isAuthenticated) {
      let hasAccess = true

      if (requiredRoles && requiredRoles.length > 0) {
        hasAccess = hasAnyRole(requiredRoles)
      }

      if (resource && action) {
        hasAccess = hasAccess && checkPermission(resource, action)
      }

      if (!hasAccess) {
        router.push(redirectTo)
      }
    }
  }, [loading, isAuthenticated, requiredRoles, resource, action, hasAnyRole, checkPermission, router, redirectTo])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  let hasAccess = true

  if (requiredRoles && requiredRoles.length > 0) {
    hasAccess = hasAnyRole(requiredRoles)
  }

  if (resource && action) {
    hasAccess = hasAccess && checkPermission(resource, action)
  }

  if (!hasAccess) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Acceso Denegado</h1>
            <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
          </div>
        </div>
      )
    )
  }

  return <>{children}</>
}
