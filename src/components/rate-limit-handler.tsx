"use client"

import { toast } from 'sonner'
import { RateLimitError } from '@/lib/rate-limit'

// Hook para manejar errores de rate limiting
export function useRateLimitHandler() {
  const handleRateLimitError = (error: unknown) => {
    if (error instanceof RateLimitError) {
      toast.error('Límite alcanzado', {
        description: error.message,
        duration: Math.min(10000, error.reset - Date.now()), // Mostrar hasta que expire
        action: {
          label: 'Entendido',
          onClick: () => {},
        },
      })
      return true // Error manejado
    }
    return false // No es error de rate limiting
  }

  const executeWithRateLimit = async <T,>(
    fn: () => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void
      onError?: (error: unknown) => void
      fallbackErrorMessage?: string
    }
  ): Promise<T | null> => {
    try {
      const result = await fn()
      options?.onSuccess?.(result)
      return result
    } catch (error) {
      if (!handleRateLimitError(error)) {
        // Si no es error de rate limiting, mostrar error genérico
        toast.error('Error', {
          description: options?.fallbackErrorMessage || 'Ocurrió un error inesperado',
        })
        options?.onError?.(error)
      }
      return null
    }
  }

  return {
    handleRateLimitError,
    executeWithRateLimit,
  }
}

// HOC para wrappear componentes que usen funciones con rate limiting
interface WithRateLimitProps {
  children: React.ReactNode
}

export function WithRateLimit({ children }: WithRateLimitProps) {
  return <>{children}</>
}

// Componente de error para mostrar cuando se alcanza el límite
interface RateLimitErrorDisplayProps {
  error: RateLimitError
  onRetry?: () => void
}

export function RateLimitErrorDisplay({ error, onRetry }: RateLimitErrorDisplayProps) {
  const timeToWait = Math.ceil((error.reset - Date.now()) / 1000)
  
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-amber-100 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-amber-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.312 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Límite alcanzado
      </h3>
      
      <p className="text-gray-600 mb-4 max-w-sm">
        {error.message}
      </p>
      
      <div className="text-sm text-gray-500 mb-4">
        Límite: {error.limit} | Restantes: {error.remaining}
      </div>
      
      {timeToWait > 0 && (
        <div className="text-sm text-amber-600 mb-4">
          Podrás intentar nuevamente en {timeToWait} segundos
        </div>
      )}
      
      {onRetry && timeToWait <= 0 && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Intentar nuevamente
        </button>
      )}
    </div>
  )
}

// Utility para formatear tiempo de espera
export function formatWaitTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} segundos`
  } else if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60)
    return `${minutes} minuto${minutes > 1 ? 's' : ''}`
  } else {
    const hours = Math.ceil(seconds / 3600)
    return `${hours} hora${hours > 1 ? 's' : ''}`
  }
}