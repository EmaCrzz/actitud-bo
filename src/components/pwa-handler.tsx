/* eslint-disable no-console */
"use client"

import type React from "react"

import { useEffect, useState } from "react"

interface PWAHandlerProps {
  children?: React.ReactNode
}

export default function PWAHandler({ children }: PWAHandlerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  useEffect(() => {
    // Verificar si ya está instalado
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)

      return
    }

    // Verificar manifest (solo para debugging)
    fetch("/manifest.json")
      .then((res) => res.json())
      .then((data) => console.log("✅ Manifest cargado:", data))
      .catch((err) => console.error("❌ Error manifest:", err))

    // Registrar Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => console.log("SW registrado:", registration))
        .catch((error) => console.log("Error SW:", error))
    }

    // Capturar evento de instalación
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowInstallBanner(true)
      console.log("Prompt de instalación disponible")
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice

      console.log("Resultado instalación:", outcome)
      setInstallPrompt(null)
      setShowInstallBanner(false)
    }
  }

  const dismissBanner = () => {
    setShowInstallBanner(false)
  }

  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent)

  return (
    <>
      {/* Banner de instalación flotante */}
      {showInstallBanner && installPrompt && (
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

      {/* Contenido principal */}
      {children}
    </>
  )
}
