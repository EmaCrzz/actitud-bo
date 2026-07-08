/* eslint-disable no-console */
'use client'

import { useEffect, useState } from 'react'
import { RefreshCcw, X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useTranslations } from '@/lib/i18n/context'

export default function SWUpdateManager() {
  const { t } = useTranslations()
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Escuchar mensajes del Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATED') {
          console.log('🔄 Nueva versión disponible:', event.data.version)
          setShowUpdateBanner(true)
        }
      })

      // Verificar actualizaciones cada 30 segundos
      const checkForUpdates = () => {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.update()
          })
        })
      }

      // Verificar inmediatamente y luego cada 30 segundos
      checkForUpdates()
      const interval = setInterval(checkForUpdates, 30000)

      return () => clearInterval(interval)
    }
  }, [])

  const handleUpdate = () => {
    // Recargar la página para aplicar la nueva versión
    window.location.reload()
  }

  const handleDismiss = () => {
    setShowUpdateBanner(false)
    // Volver a mostrar en 5 minutos
    setTimeout(() => setShowUpdateBanner(true), 5 * 60 * 1000)
  }

  if (!showUpdateBanner) return null

  return (
    <Alert className='items-center fixed bottom-32 right-4 z-50 max-w-lg bg-input-background border-[0.3px] border-white/20'>
      <RefreshCcw className='text-primary!' />
      <AlertTitle className='text-white flex justify-between items-center'>
        {t('pwa.update.title')}
        <Button className='size-4' size={'icon'} variant={'ghost'} onClick={handleDismiss}>
          <X className='text-white/70' />
        </Button>
      </AlertTitle>
      <AlertDescription className='font-secondary flex justify-between mt-1 items-center'>
        <p>{t('pwa.update.description')}</p>
        <Button className='h-4 px-0' size={'sm'} variant={'link'} onClick={handleUpdate}>
          {t('pwa.update.button')}
        </Button>
      </AlertDescription>
    </Alert>
  )
}
