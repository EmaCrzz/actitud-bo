/* eslint-disable no-console */
"use client"

import { useEffect, useState } from "react"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

export default function PWAInstallManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [showInstallMenu, setShowInstallMenu] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [installDismissed, setInstallDismissed] = useState(false)
  const [userEngagement, setUserEngagement] = useState(0)

  useEffect(() => {
    // Verificar si ya está instalado
    if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)

      return
    }

    // Cargar estado previo del localStorage
    const dismissed = localStorage.getItem("pwa-install-dismissed")
    const engagement = Number.parseInt(localStorage.getItem("user-engagement") || "0")

    setInstallDismissed(dismissed === "true")
    setUserEngagement(engagement)

    // Registrar Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
    }

    // Manejar evento de instalación nativo
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent

      if (typeof promptEvent.prompt === "function") {
        setDeferredPrompt(promptEvent)

        // Solo mostrar si no fue rechazado previamente
        if (!dismissed) {
          setShowInstallBanner(true)
        }
      }
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowInstallBanner(false)
      setShowInstallMenu(false)
      localStorage.removeItem("pwa-install-dismissed")
    }

    // Listeners
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    // 🎯 ESTRATEGIA: Incrementar engagement del usuario
    const trackEngagement = () => {
      const newEngagement = engagement + 1

      setUserEngagement(newEngagement)
      localStorage.setItem("user-engagement", newEngagement.toString())

      // Mostrar opción de instalación después de cierto engagement
      if (newEngagement >= 3 && !isInstalled && !dismissed) {
        setShowInstallMenu(true)
      }
    }

    // Trackear engagement con scroll, clicks, tiempo en página
    const handleUserActivity = () => trackEngagement()

    window.addEventListener("scroll", handleUserActivity, { passive: true })
    window.addEventListener("click", handleUserActivity)

    // Trackear tiempo en página
    const timeTracker = setTimeout(() => {
      trackEngagement()
    }, 30000) // 30 segundos

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
      window.removeEventListener("scroll", handleUserActivity)
      window.removeEventListener("click", handleUserActivity)
      clearTimeout(timeTracker)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === "accepted") {
        console.log("✅ Usuario aceptó instalación")
      } else {
        console.log("❌ Usuario rechazó instalación")
        // Marcar como rechazado por 7 días
        localStorage.setItem("pwa-install-dismissed", "true")
        setTimeout(
          () => {
            localStorage.removeItem("pwa-install-dismissed")
          },
          7 * 24 * 60 * 60 * 1000,
        ) // 7 días
      }
    } catch (error) {
      console.error("Error instalando PWA:", error)
    } finally {
      setDeferredPrompt(null)
      setShowInstallBanner(false)
      setShowInstallMenu(false)
    }
  }

  const handleDismissBanner = () => {
    setShowInstallBanner(false)
    setInstallDismissed(true)
    localStorage.setItem("pwa-install-dismissed", "true")

    // Volver a mostrar después de 24 horas
    setTimeout(
      () => {
        localStorage.removeItem("pwa-install-dismissed")
        setInstallDismissed(false)
      },
      24 * 60 * 60 * 1000,
    )
  }

  const getInstallInstructions = () => {
    // const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
    const isChrome = /Chrome/.test(navigator.userAgent)
    const isFirefox = /Firefox/.test(navigator.userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

    if (isIOS) {
      return {
        title: "Instalar en iOS",
        steps: [
          "1. Toca el botón de compartir (⬆️)",
          "2. Selecciona 'Añadir a pantalla de inicio'",
          "3. Toca 'Añadir' para confirmar",
        ],
      }
    } else if (isChrome) {
      return {
        title: "Instalar en Chrome",
        steps: [
          "1. Busca el ícono de instalación (⬇️) en la barra de direcciones",
          "2. O ve a Menú → 'Instalar Actitud'",
          "3. Confirma la instalación",
        ],
      }
    } else if (isFirefox) {
      return {
        title: "Instalar en Firefox",
        steps: [
          "1. Busca el ícono de instalación en la barra de direcciones",
          "2. O ve a Menú → 'Instalar esta aplicación'",
          "3. Confirma la instalación",
        ],
      }
    }

    return {
      title: "Instalar aplicación",
      steps: [
        "1. Busca la opción de instalación en tu navegador",
        "2. Generalmente está en el menú o barra de direcciones",
        "3. Confirma la instalación",
      ],
    }
  }

  if (isInstalled) return null

  return (
    <>
      {/* Banner de instalación nativo */}
      {showInstallBanner && deferredPrompt && (
        <div className="fixed bottom-4 right-4 bg-[#ff1168] text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
          <p className="mb-2 font-medium">¡Instala Actitud!</p>
          <p className="mb-3 text-sm opacity-90">Accede más rápido desde tu escritorio</p>
          <div className="flex gap-2">
            <button
              className="bg-white text-[#ff1168] px-4 py-2 rounded font-semibold hover:bg-gray-100 transition-colors"
              onClick={handleInstallClick}
            >
              Instalar
            </button>
            <button
              className="border border-white px-4 py-2 rounded font-semibold hover:bg-white hover:bg-opacity-10 transition-colors"
              onClick={handleDismissBanner}
            >
              Ahora no
            </button>
          </div>
        </div>
      )}

      {/* Menú de instalación alternativo */}
      {showInstallMenu && !showInstallBanner && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">📱</span>
            <p className="font-medium">¿Quieres instalar la app?</p>
          </div>
          <p className="text-sm opacity-90 mb-3">Instala Actitud para un acceso más rápido y una mejor experiencia</p>
          <div className="flex gap-2">
            {deferredPrompt ? (
              <button
                className="bg-[#ff1168] px-4 py-2 rounded font-semibold hover:bg-[#e00e5a] transition-colors"
                onClick={handleInstallClick}
              >
                Instalar
              </button>
            ) : (
              <button
                className="bg-[#ff1168] px-4 py-2 rounded font-semibold hover:bg-[#e00e5a] transition-colors"
                onClick={() => setShowInstallMenu(false)}
              >
                Ver cómo
              </button>
            )}
            <button
              className="border border-gray-600 px-4 py-2 rounded font-semibold hover:bg-gray-700 transition-colors"
              onClick={() => setShowInstallMenu(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Instrucciones manuales */}
      {showInstallMenu && !deferredPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">{getInstallInstructions().title}</h3>
            <div className="space-y-2 mb-4">
              {getInstallInstructions().steps.map((step, index) => (
                <p key={index} className="text-sm text-gray-700">
                  {step}
                </p>
              ))}
            </div>
            <button
              className="w-full bg-[#ff1168] text-white py-2 rounded font-semibold hover:bg-[#e00e5a] transition-colors"
              onClick={() => setShowInstallMenu(false)}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Botón flotante discreto para usuarios que perdieron el banner */}
      {!showInstallBanner && !showInstallMenu && userEngagement >= 5 && !installDismissed && (
        <button
          className="fixed bottom-4 left-4 bg-[#ff1168] text-white p-3 rounded-full shadow-lg z-40 hover:bg-[#e00e5a] transition-colors"
          title="Instalar aplicación"
          onClick={() => setShowInstallMenu(true)}
        >
          <span className="text-lg">📱</span>
        </button>
      )}
    </>
  )
}
