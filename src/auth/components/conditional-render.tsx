"use client"

import type React from "react"

import { usePermissions } from "@/auth/hooks/use-permissions"
import type { UserRole } from "@/auth/types"

interface ConditionalRenderProps {
  children: React.ReactNode
  requiredRoles?: UserRole[]
  resource?: string
  action?: "create" | "read" | "update" | "delete"
  fallback?: React.ReactNode
}

export function ConditionalRender({
  children,
  requiredRoles,
  resource,
  action,
  fallback = null,
}: ConditionalRenderProps) {
  const { hasAnyRole, checkPermission, loading } = usePermissions()

  if (loading) {
    return <>{fallback}</>
  }

  let hasAccess = true

  if (requiredRoles && requiredRoles.length > 0) {
    hasAccess = hasAnyRole(requiredRoles)
  }

  if (resource && action) {
    hasAccess = hasAccess && checkPermission(resource, action)
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>
}
