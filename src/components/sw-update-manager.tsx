/* eslint-disable no-console */
"use client"

import { useEffect, useState } from "react"

export default function SWUpdateManager() {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)
  const [newVersion, setNewVersion] = useState("")

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Escuchar mensajes del Service Worker
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data && event.data.type === "SW_UPDATED") {
          console.log("🔄 Nueva versión disponible:", event.data.version)
          setNewVersion(event.data.version)
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
    <div className="fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-sm">🔄</span>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Nueva versión disponible</h3>
          <p className="text-xs opacity-90 mt-1">
            Versión {newVersion} lista. Actualiza para obtener las últimas mejoras.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              className="bg-white text-blue-600 px-3 py-1 rounded text-xs font-semibold hover:bg-gray-100"
              onClick={handleUpdate}
            >
              Actualizar
            </button>
            <button
              className="border border-white px-3 py-1 rounded text-xs hover:bg-white hover:bg-opacity-10"
              onClick={handleDismiss}
            >
              Después
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
