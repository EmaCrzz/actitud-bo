/* eslint-disable no-console */

"use client"

import type React from "react"
import { useEffect, useState } from "react"

interface PWAHandlerProps {
  children?: React.ReactNode
}

export default function PWAHandler({ children }: PWAHandlerProps) {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    // Verificar si ya está instalado
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    const isInWebAppiOS = (window.navigator as any).standalone === true
    const isInstalled = isStandalone || isInWebAppiOS

    setIsInstalled(isInstalled)

    if (isInstalled) {
      console.log("✅ App ya está instalada")

      return
    }

    // Debug info
    const debug = {
      userAgent: navigator.userAgent,
      isStandalone,
      isInWebAppiOS,
      hasServiceWorker: "serviceWorker" in navigator,
      protocol: window.location.protocol,
    }

    setDebugInfo(debug)
    console.log("🔍 Debug PWA:", debug)

    // Verificar manifest
    fetch("/manifest.json")
      .then((res) => res.json())
      .then((data) => {
        console.log("✅ Manifest cargado:", data)
        // Verificar si el theme color cambió
        const metaTheme = document.querySelector('meta[name="theme-color"]')

        if (metaTheme && metaTheme.getAttribute("content") !== data.theme_color) {
          console.log("🎨 Actualizando theme color:", data.theme_color)
          metaTheme.setAttribute("content", data.theme_color)
        }
      })
      .catch((err) => console.error("❌ Error manifest:", err))

    // Registrar Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registrado:", registration)

          // Verificar actualizaciones
          registration.addEventListener("updatefound", () => {
            console.log("🔄 Nueva versión del SW disponible")
            const newWorker = registration.installing

            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  console.log("✅ Nueva versión instalada, recarga para aplicar")
                  // Opcional: mostrar notificación de actualización
                }
              })
            }
          })
        })
        .catch((error) => console.log("Error SW:", error))
    }

    // Capturar evento de instalación
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("🎯 Evento beforeinstallprompt capturado:", e)
      e.preventDefault()
      setInstallPrompt(e)
      setShowInstallBanner(true)
    }

    // Detectar si la app fue instalada
    const handleAppInstalled = () => {
      console.log("✅ App instalada exitosamente")
      setIsInstalled(true)
      setShowInstallBanner(false)
      setInstallPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    console.log({installPrompt});
    
    if (installPrompt) {
      try {
        installPrompt.prompt()
        const { outcome } = await installPrompt.userChoice

        console.log("Resultado instalación:", outcome)

        if (outcome === "accepted") {
          console.log("✅ Usuario aceptó la instalación")
        } else {
          console.log("❌ Usuario rechazó la instalación")
        }

        setInstallPrompt(null)
        setShowInstallBanner(false)
      } catch (error) {
        console.error("Error durante instalación:", error)
      }
    }
  }

  const dismissBanner = () => {
    setShowInstallBanner(false)
    console.log("Banner de instalación cerrado por el usuario")
  }

  // Forzar mostrar banner (solo para desarrollo)
  const forceShowBanner = () => {
    if (process.env.NODE_ENV === "development") {
      setShowInstallBanner(true)
      console.log("🔧 Banner forzado (solo desarrollo)")
    }
  }

  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent)

  return (
    <>
      {/* Debug panel (solo en desarrollo) */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed top-0 right-0 bg-black text-white p-2 text-xs z-50 max-w-xs">
          <details>
            <summary>PWA Debug</summary>
            <pre className="mt-2 text-xs overflow-auto max-h-32">
              {JSON.stringify(
                {
                  showInstallBanner,
                  hasInstallPrompt: !!installPrompt,
                  isInstalled,
                  ...debugInfo,
                },
                null,
                2,
              )}
            </pre>
            <button className="bg-blue-500 text-white px-2 py-1 rounded text-xs mt-2" onClick={forceShowBanner}>
              Forzar Banner
            </button>
          </details>
        </div>
      )}

      {/* Banner de instalación flotante */}
      {showInstallBanner && (installPrompt || process.env.NODE_ENV === "development") && (
        <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-pink-500 to-red-500 text-white p-4 shadow-lg z-50">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📱</span>
              <div>
                <p className="font-semibold">¡Instala Actitud!</p>
                <p className="text-sm opacity-90">Accede más rápido desde tu pantalla de inicio</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                className="bg-white text-pink-500 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                onClick={handleInstall}
              >
                Instalar
              </button>
              <button aria-label="Cerrar" className="text-white hover:text-gray-200 p-2" onClick={dismissBanner}>
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner para iOS */}
      {isIOS && !isInstalled && (
        <div className="fixed bottom-0 left-0 right-0 bg-blue-500 text-white p-4 shadow-lg z-50">
          <div className="max-w-4xl mx-auto text-center">
            <p className="font-semibold mb-2">📱 Instalar en iOS</p>
            <p className="text-sm">
              Toca <span className="font-bold">⎋</span> → Añadir a pantalla de inicio{" "}
              <span className="font-bold">➕</span>
            </p>
          </div>
        </div>
      )}

      {children}
    </>
  )
}
