/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
"use client"

import { useEffect, useState, useRef } from "react"

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
  const [showInstructions, setShowInstructions] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [installDismissed, setInstallDismissed] = useState(false)
  const [userEngagement, setUserEngagement] = useState(0)
  const [menuDismissedAt, setMenuDismissedAt] = useState<number | null>(null)

  // Refs para identificar elementos del PWA installer
  const pwaElementsRef = useRef<Set<HTMLElement>>(new Set())

  // Función mejorada para detectar si la app está instalada
  const checkIfInstalled = () => {
    const isStandalone = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches
    const isIOSStandalone = (window.navigator as any).standalone === true
    const isFromInstalledApp = window.location.search.includes("utm_source=pwa")

    return isStandalone || isIOSStandalone || isFromInstalledApp
  }

  useEffect(() => {
    // 🔍 VERIFICAR SI YA ESTÁ INSTALADA (PRIMERA PRIORIDAD)
    if (checkIfInstalled()) {
      console.log("✅ PWA ya está instalada")
      setIsInstalled(true)

      return
    }

    // Cargar estado previo del localStorage
    const dismissed = localStorage.getItem("pwa-install-dismissed") === "true"
    const engagement = Number.parseInt(localStorage.getItem("user-engagement") || "0")
    const lastDismissed = localStorage.getItem("pwa-menu-dismissed-at")

    setInstallDismissed(dismissed)
    setUserEngagement(engagement)
    setMenuDismissedAt(lastDismissed ? Number.parseInt(lastDismissed) : null)

    console.log("📊 Estado inicial:", { dismissed, engagement, lastDismissed })

    // Registrar Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
    }

    // Manejar evento de instalación nativo
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("🎯 Evento beforeinstallprompt capturado")
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent

      if (typeof promptEvent.prompt === "function") {
        setDeferredPrompt(promptEvent)

        if (!dismissed) {
          setShowInstallBanner(true)
          console.log("✅ Mostrando banner nativo")
        }
      }
    }

    const handleAppInstalled = () => {
      console.log("🎉 App instalada exitosamente")
      setIsInstalled(true)
      setShowInstallBanner(false)
      setShowInstallMenu(false)
      setShowInstructions(false)
      localStorage.removeItem("pwa-install-dismissed")
      localStorage.removeItem("user-engagement")
      localStorage.removeItem("pwa-menu-dismissed-at")
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  // 🎯 EFFECT SEPARADO PARA TRACKING DE ENGAGEMENT (MEJORADO)
  useEffect(() => {
    // No trackear si ya está instalada, si hay banners activos, o si fue rechazado
    if (isInstalled || showInstallBanner || showInstallMenu || showInstructions || installDismissed) {
      return
    }

    // No mostrar el menú si fue cerrado recientemente (cooldown de 2 minutos)
    const now = Date.now()

    if (menuDismissedAt && now - menuDismissedAt < 2 * 60 * 1000) {
      console.log("⏰ Cooldown activo, no mostrando menú")

      return
    }

    let engagementCount = 0
    let scrollCount = 0
    let lastScrollTime = 0

    const trackEngagement = (source: string) => {
      const newEngagement = userEngagement + 1

      setUserEngagement(newEngagement)
      localStorage.setItem("user-engagement", newEngagement.toString())

      console.log(`📈 Engagement: ${newEngagement} (${source})`)

      // Mostrar menú después de cierto engagement
      if (newEngagement >= 3 && !showInstallMenu) {
        console.log("🎯 Mostrando menú por engagement")
        setShowInstallMenu(true)
      }
    }

    // 🖱️ TRACKING DE CLICKS (más inteligente)
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement

      // 🚫 EXCLUIR clicks en elementos del PWA installer
      if (pwaElementsRef.current.has(target) || target.closest("[data-pwa-installer]")) {
        console.log("🚫 Click en PWA installer ignorado")

        return
      }

      // Solo trackear clicks en elementos interactivos del contenido principal
      const isInteractiveElement =
        target.tagName === "BUTTON" ||
        target.tagName === "A" ||
        target.closest("button") ||
        target.closest("a") ||
        target.closest('[role="button"]')

      if (isInteractiveElement) {
        engagementCount++
        if (engagementCount <= 3) {
          // Máximo 3 clicks trackeable
          trackEngagement("click")
        }
      }
    }

    // 📜 TRACKING DE SCROLL (throttled)
    const handleScroll = () => {
      const now = Date.now()

      if (now - lastScrollTime > 5000) {
        // Solo cada 5 segundos
        lastScrollTime = now
        scrollCount++
        if (scrollCount <= 2) {
          // Máximo 2 scrolls trackeables
          trackEngagement("scroll")
        }
      }
    }

    // 🕐 TRACKING DE TIEMPO (una sola vez)
    const timeTracker = setTimeout(() => {
      trackEngagement("time")
    }, 30000) // 30 segundos

    window.addEventListener("click", handleClick)
    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("click", handleClick)
      window.removeEventListener("scroll", handleScroll)
      clearTimeout(timeTracker)
    }
  }, [
    userEngagement,
    isInstalled,
    showInstallMenu,
    showInstallBanner,
    showInstructions,
    installDismissed,
    menuDismissedAt,
  ])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log("❌ No hay prompt nativo, mostrando instrucciones")
      setShowInstallMenu(false)
      setShowInstructions(true)

      return
    }

    try {
      console.log("🚀 Iniciando instalación nativa...")
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === "accepted") {
        console.log("✅ Usuario aceptó instalación")
      } else {
        console.log("❌ Usuario rechazó instalación")
        localStorage.setItem("pwa-install-dismissed", "true")
        setTimeout(
          () => {
            localStorage.removeItem("pwa-install-dismissed")
          },
          7 * 24 * 60 * 60 * 1000,
        )
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
    console.log("❌ Banner rechazado por usuario")
    setShowInstallBanner(false)
    setInstallDismissed(true)
    localStorage.setItem("pwa-install-dismissed", "true")

    setTimeout(
      () => {
        localStorage.removeItem("pwa-install-dismissed")
        setInstallDismissed(false)
      },
      24 * 60 * 60 * 1000,
    )
  }

  const handleCloseMenu = () => {
    console.log("🔒 Cerrando menú de instalación")
    const now = Date.now()

    setShowInstallMenu(false)
    setMenuDismissedAt(now)
    localStorage.setItem("pwa-menu-dismissed-at", now.toString())
  }

  const handleCloseInstructions = () => {
    console.log("🔒 Cerrando instrucciones")
    setShowInstructions(false)
  }

  const getInstallInstructions = () => {
    const isChrome = /Chrome/.test(navigator.userAgent)
    const isFirefox = /Firefox/.test(navigator.userAgent)
    // const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
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

  // 🚫 NO MOSTRAR NADA SI YA ESTÁ INSTALADA
  if (isInstalled) {
    return null
  }

  return (
    <>
      {/* Banner de instalación nativo */}
      {showInstallBanner && deferredPrompt && (
        <div
          data-pwa-installer
          className="fixed bottom-4 right-4 bg-[#ff1168] text-white p-4 rounded-lg shadow-lg z-50 max-w-sm"
        >
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
        <div
          data-pwa-installer
          className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">📱</span>
            <p className="font-medium">¿Quieres instalar la app?</p>
          </div>
          <p className="text-sm opacity-90 mb-3">Instala Actitud para un acceso más rápido y una mejor experiencia</p>
          <div className="flex gap-2">
            <button
              className="bg-[#ff1168] px-4 py-2 rounded font-semibold hover:bg-[#e00e5a] transition-colors"
              onClick={handleInstallClick}
            >
              {deferredPrompt ? "Instalar" : "Ver cómo"}
            </button>
            <button
              className="border border-gray-600 px-4 py-2 rounded font-semibold hover:bg-gray-700 transition-colors"
              onClick={handleCloseMenu}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal de instrucciones */}
      {showInstructions && (
        <div
          data-pwa-installer
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4 text-black">{getInstallInstructions().title}</h3>
            <div className="space-y-2 mb-4">
              {getInstallInstructions().steps.map((step, index) => (
                <p key={index} className="text-sm text-gray-700">
                  {step}
                </p>
              ))}
            </div>
            <button
              className="w-full bg-[#ff1168] text-white py-2 rounded font-semibold hover:bg-[#e00e5a] transition-colors"
              onClick={handleCloseInstructions}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Botón flotante discreto */}
      {!showInstallBanner && !showInstallMenu && !showInstructions && userEngagement >= 5 && !installDismissed && (
        <button
          data-pwa-installer
          className="fixed bottom-4 left-4 bg-[#ff1168] text-white size-10 rounded-full shadow-lg z-40 hover:bg-[#e00e5a] transition-colors"
          title="Instalar aplicación"
          onClick={() => setShowInstallMenu(true)}
        >
          <span className="text-lg">📱</span>
        </button>
      )}
    </>
  )
}
