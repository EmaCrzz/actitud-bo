/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Smartphone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from '@/lib/i18n/context'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export default function PWAInstallManager() {
  const { t } = useTranslations()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [showInstallMenu, setShowInstallMenu] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [installDismissed, setInstallDismissed] = useState(false)
  const [userEngagement, setUserEngagement] = useState(0)
  const [menuDismissedAt, setMenuDismissedAt] = useState<number | null>(null)
  const [isCheckingInstallation, setIsCheckingInstallation] = useState(true)

  // Función mejorada para detectar si la app está instalada
  const checkIfInstalled = () => {
    const isStandalone =
      window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
    const isIOSStandalone = (window.navigator as any).standalone === true
    const isFromInstalledApp = window.location.search.includes('utm_source=pwa')

    return isStandalone || isIOSStandalone || isFromInstalledApp
  }

  // 🔍 EFFECT PRINCIPAL - Solo verificar instalación
  useEffect(() => {
    const checkInstallation = () => {
      if (checkIfInstalled()) {
        console.log('✅ PWA ya está instalada - desactivando PWA installer')
        setIsInstalled(true)
        setIsCheckingInstallation(false)

        return true
      }
      setIsCheckingInstallation(false)

      return false
    }

    // Verificar inmediatamente
    if (checkInstallation()) {
      return
    }

    // Verificar nuevamente después de un delay (para casos edge)
    const delayedCheck = setTimeout(() => {
      checkInstallation()
    }, 1000)

    return () => clearTimeout(delayedCheck)
  }, [])

  // 🎯 EFFECT PARA PWA EVENTS - Solo si NO está instalada
  useEffect(() => {
    if (isInstalled || isCheckingInstallation) {
      return
    }

    console.log('🔧 Inicializando PWA installer')

    // Cargar estado previo del localStorage
    const dismissed = localStorage.getItem('pwa-install-dismissed') === 'true'
    const engagement = Number.parseInt(localStorage.getItem('user-engagement') || '0')
    const lastDismissed = localStorage.getItem('pwa-menu-dismissed-at')

    setInstallDismissed(dismissed)
    setUserEngagement(engagement)
    setMenuDismissedAt(lastDismissed ? Number.parseInt(lastDismissed) : null)

    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
    }

    // Manejar evento de instalación nativo
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('🎯 Evento beforeinstallprompt capturado')
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent

      if (typeof promptEvent.prompt === 'function') {
        setDeferredPrompt(promptEvent)
        if (!dismissed) {
          setShowInstallBanner(true)
          console.log('✅ Mostrando banner nativo')
        }
      }
    }

    const handleAppInstalled = () => {
      console.log('🎉 App instalada exitosamente')
      setIsInstalled(true)
      setShowInstallBanner(false)
      setShowInstallMenu(false)
      setShowInstructions(false)
      localStorage.removeItem('pwa-install-dismissed')
      localStorage.removeItem('user-engagement')
      localStorage.removeItem('pwa-menu-dismissed-at')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [isInstalled, isCheckingInstallation])

  // 🎯 EFFECT PARA ENGAGEMENT TRACKING - Solo si NO está instalada y NO hay UI activa
  // Optimizado: usar una sola condición derivada y useRef para valores transitorios
  useEffect(() => {
    const shouldTrack =
      !isInstalled &&
      !isCheckingInstallation &&
      !showInstallBanner &&
      !showInstallMenu &&
      !showInstructions &&
      !installDismissed

    if (!shouldTrack) {
      console.log('🚫 Tracking deshabilitado')

      return
    }

    // Verificar cooldown
    const now = Date.now()

    if (menuDismissedAt && now - menuDismissedAt < 2 * 60 * 1000) {
      console.log('⏰ Cooldown activo, no trackear engagement')

      return
    }

    console.log('📊 Iniciando tracking de engagement')

    let engagementCount = 0
    let scrollCount = 0
    let lastScrollTime = 0

    const trackEngagement = (source: string) => {
      const newEngagement = userEngagement + 1

      setUserEngagement(newEngagement)
      localStorage.setItem('user-engagement', newEngagement.toString())

      console.log(`📈 Engagement: ${newEngagement} (${source})`)

      // Mostrar menú después de cierto engagement
      if (newEngagement >= 3 && !showInstallMenu) {
        console.log('🎯 Mostrando menú por engagement')
        setShowInstallMenu(true)
      }
    }

    // 🖱️ TRACKING DE CLICKS - MÁS ESPECÍFICO
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement

      // 🚫 EXCLUIR elementos del PWA installer
      if (target.closest('[data-pwa-installer]')) {
        return
      }

      // 🚫 EXCLUIR inputs y elementos de formulario
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.closest('form') ||
        target.contentEditable === 'true'
      ) {
        return
      }

      // Solo trackear clicks en elementos específicos
      const isTrackableElement =
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        target.closest('[role="link"]')

      if (isTrackableElement && engagementCount < 3) {
        engagementCount++
        trackEngagement('click')
      }
    }

    // 📜 TRACKING DE SCROLL - THROTTLED
    const handleScroll = () => {
      const now = Date.now()

      if (now - lastScrollTime > 10000 && scrollCount < 2) {
        // Solo cada 10 segundos, máximo 2 veces
        lastScrollTime = now
        scrollCount++
        trackEngagement('scroll')
      }
    }

    // 🕐 TRACKING DE TIEMPO - UNA SOLA VEZ
    const timeTracker = setTimeout(() => {
      trackEngagement('time')
    }, 30000)

    // 👆 USAR CAPTURE PHASE PARA MEJOR CONTROL
    window.addEventListener('click', handleClick, { capture: true })
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      console.log('🧹 Limpiando event listeners de engagement')
      window.removeEventListener('click', handleClick, { capture: true })
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(timeTracker)
    }
    // Reducir dependencias solo a las booleanas necesarias
  }, [
    userEngagement,
    isInstalled,
    isCheckingInstallation,
    showInstallMenu,
    showInstallBanner,
    showInstructions,
    installDismissed,
    menuDismissedAt,
  ])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('❌ No hay prompt nativo, mostrando instrucciones')
      setShowInstallMenu(false)
      setShowInstructions(true)

      return
    }

    try {
      console.log('🚀 Iniciando instalación nativa...')
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        console.log('✅ Usuario aceptó instalación')
      } else {
        console.log('❌ Usuario rechazó instalación')
        localStorage.setItem('pwa-install-dismissed', 'true')
        setTimeout(
          () => {
            localStorage.removeItem('pwa-install-dismissed')
          },
          7 * 24 * 60 * 60 * 1000
        )
      }
    } catch (error) {
      console.error('Error instalando PWA:', error)
    } finally {
      setDeferredPrompt(null)
      setShowInstallBanner(false)
      setShowInstallMenu(false)
    }
  }

  const handleDismissBanner = () => {
    console.log('❌ Banner rechazado por usuario')
    setShowInstallBanner(false)
    setInstallDismissed(true)
    localStorage.setItem('pwa-install-dismissed', 'true')

    setTimeout(
      () => {
        localStorage.removeItem('pwa-install-dismissed')
        setInstallDismissed(false)
      },
      24 * 60 * 60 * 1000
    )
  }

  const handleCloseMenu = () => {
    console.log('🔒 Cerrando menú de instalación')
    const now = Date.now()

    setShowInstallMenu(false)
    setMenuDismissedAt(now)
    localStorage.setItem('pwa-menu-dismissed-at', now.toString())
  }

  const handleCloseInstructions = () => {
    console.log('🔒 Cerrando instrucciones')
    setShowInstructions(false)
  }

  const getInstallInstructions = () => {
    const isChrome = /Chrome/.test(navigator.userAgent)
    const isFirefox = /Firefox/.test(navigator.userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

    if (isIOS) {
      return {
        title: t('pwa.install.ios.title'),
        steps: [t('pwa.install.ios.step1'), t('pwa.install.ios.step2'), t('pwa.install.ios.step3')],
      }
    } else if (isChrome) {
      return {
        title: t('pwa.install.chrome.title'),
        steps: [
          t('pwa.install.chrome.step1'),
          t('pwa.install.chrome.step2'),
          t('pwa.install.chrome.step3'),
        ],
      }
    } else if (isFirefox) {
      return {
        title: t('pwa.install.firefox.title'),
        steps: [
          t('pwa.install.firefox.step1'),
          t('pwa.install.firefox.step2'),
          t('pwa.install.firefox.step3'),
        ],
      }
    }

    return {
      title: t('pwa.install.generic.title'),
      steps: [
        t('pwa.install.generic.step1'),
        t('pwa.install.generic.step2'),
        t('pwa.install.generic.step3'),
      ],
    }
  }

  // 🚫 NO RENDERIZAR NADA SI ESTÁ INSTALADA O AÚN VERIFICANDO
  // if (isInstalled || isCheckingInstallation) {
  //   return null
  // }

  return (
    <>
      {/* Banner de instalación nativo */}
      {showInstallBanner && deferredPrompt && (
        <Alert className='items-center fixed bottom-32 z-50 max-w-[95%] left-1/2 -translate-x-1/2 w-full sm:right-4 sm:max-w-lg bg-inpu-background border-[0.3px] border-white/20'>
          <Smartphone className='text-primary!' />
          <AlertTitle className='text-white flex justify-between items-center'>
            {t('pwa.install.title')}
            <Button
              className='size-4'
              size={'icon'}
              variant={'ghost'}
              onClick={handleDismissBanner}
            >
              <X className='text-white/70' />
            </Button>
          </AlertTitle>
          <AlertDescription className='font-secondary flex justify-between mt-1 items-center'>
            <p>{t('pwa.install.description')}</p>
            <Button className='h-4 px-0' size={'sm'} variant={'link'} onClick={handleInstallClick}>
              {t('pwa.install.button')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Menú de instalación alternativo */}
      {showInstallMenu && !showInstallBanner && (
        <Alert className='items-center fixed bottom-32 z-50 max-w-[95%] left-1/2 -translate-x-1/2 w-full sm:right-4 sm:max-w-lg bg-input-background border-[0.3px] border-white/20'>
          <Smartphone className='text-primary!' />
          <AlertTitle className='text-white flex justify-between items-center'>
            {t('pwa.install.title')}
            <Button className='size-4' size={'icon'} variant={'ghost'} onClick={handleCloseMenu}>
              <X className='text-white/70' />
            </Button>
          </AlertTitle>
          <AlertDescription className='font-secondary flex justify-between mt-1 items-center'>
            <p>{t('pwa.install.description')}</p>
            <Button className='h-4 px-0' size={'sm'} variant={'link'} onClick={handleInstallClick}>
              {deferredPrompt ? t('pwa.install.button') : t('pwa.install.howTo')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Modal de instrucciones */}
      {showInstructions && (
        <div
          data-pwa-installer
          className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
        >
          <div className='bg-input-background rounded-[4px] p-6 max-w-md w-full text-white'>
            <h3 className='text-lg font-semibold mb-4'>{getInstallInstructions().title}</h3>
            <div className='space-y-2 mb-4'>
              {getInstallInstructions().steps.map((step, index) => (
                <p key={index} className='text-sm text-white/70'>
                  {step}
                </p>
              ))}
            </div>
            <Button className='w-full h-14' onClick={handleCloseInstructions}>
              {t('pwa.install.understood')}
            </Button>
          </div>
        </div>
      )}

      {/* Botón flotante discreto */}
      {!showInstallBanner &&
        !showInstallMenu &&
        !showInstructions &&
        userEngagement >= 5 &&
        !installDismissed && (
          <button
            data-pwa-installer
            className='fixed bottom-4 left-4 bg-primary text-primary-foreground size-10 rounded-full shadow-lg z-40 hover:bg-primary/80 transition-colors'
            title={t('pwa.install.appTitle')}
            onClick={() => setShowInstallMenu(true)}
          >
            <span className='text-lg'>📱</span>
          </button>
        )}
    </>
  )
}
