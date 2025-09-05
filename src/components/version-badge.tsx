"use client"

import { getVersionInfo } from '@/lib/version'
import { cn } from '@/lib/utils'

interface VersionBadgeProps {
  variant?: 'default' | 'compact' | 'detailed'
  position?: 'fixed' | 'inline'
  className?: string
}

export default function VersionBadge({ 
  variant = 'default', 
  position = 'fixed',
  className 
}: VersionBadgeProps) {
  const versionInfo = getVersionInfo()

  if (variant === 'compact') {
    return (
      <div className={cn(
        'text-xs text-muted-foreground',
        className
      )}>
        {versionInfo.displayVersion}
      </div>
    )
  }

  if (variant === 'detailed') {
    return (
      <div className={cn(
        'text-xs text-muted-foreground space-y-1',
        className
      )}>
        <div>Version: {versionInfo.displayVersion}</div>
        <div>Environment: {versionInfo.environment}</div>
        <div>Build: {versionInfo.buildDate}</div>
      </div>
    )
  }

  return (
    <div className={cn(
      'flex items-center gap-2 text-xs',
      position === 'fixed' && 'fixed bottom-2 right-2 z-50',
      className
    )}>
      <span
        className={cn(
          'px-2 py-1 rounded-full font-medium',
          versionInfo.isProduction 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-orange-100 text-orange-800 border border-orange-200'
        )}
      >
        {versionInfo.displayVersion}
      </span>
      
      {versionInfo.isDevelopment && (
        <span className="text-muted-foreground">
          DEV
        </span>
      )}
    </div>
  )
}

// Componente especializado para footer
export function VersionFooter({ className }: { className?: string }) {
  const versionInfo = getVersionInfo()
  
  return (
    <div className={cn(
      'flex items-center justify-between text-xs text-muted-foreground',
      className
    )}>
      <span>© 2024 Actitud</span>
      <span>{versionInfo.displayVersion}</span>
    </div>
  )
}

// Componente para header/navbar  
export function VersionHeader({ className }: { className?: string }) {
  const versionInfo = getVersionInfo()
  
  return (
    <span className={cn(
      'text-xs text-muted-foreground opacity-70',
      className
    )}>
      {versionInfo.displayVersion}
    </span>
  )
}