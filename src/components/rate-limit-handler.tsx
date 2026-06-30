'use client'

import { toast } from 'sonner'
import { RateLimitError } from '@/lib/rate-limit'
import { useTranslations } from '@/lib/i18n/context'
import { TranslationKey } from '@/lib/i18n/types'

// Hook para manejar errores de rate limiting
export function useRateLimitHandler() {
  const { t } = useTranslations()

  const handleRateLimitError = (error: unknown) => {
    if (error instanceof RateLimitError) {
      toast.error(t('rateLimit.limitReached'), {
        description: error.message,
        duration: Math.min(10000, error.reset - Date.now()), // Mostrar hasta que expire
        action: {
          label: t('rateLimit.understood'),
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
        toast.error(t('common.error'), {
          description: options?.fallbackErrorMessage || t('rateLimit.unexpectedError'),
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
  const { t } = useTranslations()
  const timeToWait = Math.ceil((error.reset - Date.now()) / 1000)

  return (
    <div className='flex flex-col items-center justify-center p-6 text-center'>
      <div className='w-16 h-16 mb-4 rounded-full bg-amber-100 flex items-center justify-center'>
        <svg
          className='w-8 h-8 text-amber-600'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.312 16.5c-.77.833.192 2.5 1.732 2.5z'
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
          />
        </svg>
      </div>

      <h3 className='text-lg font-semibold text-gray-900 mb-2'>{t('rateLimit.limitReached')}</h3>

      <p className='text-gray-600 mb-4 max-w-sm'>{error.message}</p>

      <div className='text-sm text-gray-500 mb-4'>
        {t('rateLimit.limit')}: {error.limit} | {t('rateLimit.remaining')}: {error.remaining}
      </div>

      {timeToWait > 0 && (
        <div className='text-sm text-amber-600 mb-4'>
          {t('rateLimit.tryAgainIn').replace('{time}', formatWaitTime(timeToWait, t))}
        </div>
      )}

      {onRetry && timeToWait <= 0 && (
        <button
          className='px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors'
          onClick={onRetry}
        >
          {t('rateLimit.tryAgain')}
        </button>
      )}
    </div>
  )
}

// Utility para formatear tiempo de espera
export function formatWaitTime(seconds: number, t: (key: TranslationKey) => string): string {
  if (seconds < 60) {
    return seconds === 1
      ? t('rateLimit.time.seconds').replace('{count}', '1')
      : t('rateLimit.time.secondsPlural').replace('{count}', seconds.toString())
  } else if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60)

    return minutes === 1
      ? t('rateLimit.time.minutes').replace('{count}', '1')
      : t('rateLimit.time.minutesPlural').replace('{count}', minutes.toString())
  } else {
    const hours = Math.ceil(seconds / 3600)

    return hours === 1
      ? t('rateLimit.time.hours').replace('{count}', '1')
      : t('rateLimit.time.hoursPlural').replace('{count}', hours.toString())
  }
}
