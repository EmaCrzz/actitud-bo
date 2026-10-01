/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

// Generar versión basada en timestamp + hash aleatorio
const generateVersion = () => {
  const timestamp = new Date().getTime()
  const hash = Math.random().toString(36).substring(2, 8)

  return `v${timestamp}-${hash}`
}

// Template del Service Worker (sin variables de entorno)
const swTemplate = `/* eslint-disable no-console */
// 🤖 GENERADO AUTOMÁTICAMENTE - NO EDITAR MANUALMENTE
const CACHE_VERSION = "{{VERSION}}"
const STATIC_CACHE = \`actitud-static-\${CACHE_VERSION}\`
const DYNAMIC_CACHE = \`actitud-dynamic-\${CACHE_VERSION}\`
const RUNTIME_CACHE = \`actitud-runtime-\${CACHE_VERSION}\`

console.log("🔧 SW: Iniciando versión " + CACHE_VERSION)

const CRITICAL_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/manifest-icon-192.maskable.png",
  "/icons/manifest-icon-512.maskable.png",
]

// Instalación
self.addEventListener("install", (event) => {
  console.log("🔧 SW: Instalando versión " + CACHE_VERSION)
  
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("📦 SW: Cacheando recursos críticos")
        return cache.addAll(CRITICAL_ASSETS)
      })
      .then(() => {
        console.log("✅ SW: Instalación completada")
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error("❌ SW: Error en instalación:", error)
      }),
  )
})

// Activación
self.addEventListener("activate", (event) => {
  console.log("🚀 SW: Activando versión " + CACHE_VERSION)

  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== RUNTIME_CACHE) {
                console.log("🗑️ SW: Eliminando cache viejo:", cacheName)
                return caches.delete(cacheName)
              }
            }),
          )
        }),
      self.clients.claim(),
    ]).then(() => {
      console.log("✅ SW: Activación completada")
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: "SW_UPDATED",
            version: CACHE_VERSION,
          })
        })
      })
    }),
  )
})

// Fetch strategy
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (url.origin !== location.origin) {
    return
  }

  // Network First para HTML y Next.js assets
  if (request.destination === "document" || request.url.includes("/_next/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          return caches.match(request).then((response) => {
            return response || caches.match("/")
          })
        }),
    )
    return
  }

  // Cache First para imágenes y iconos
  if (request.destination === "image" || request.url.includes("/icons/")) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response
        }
        return fetch(request).then((fetchResponse) => {
          const responseClone = fetchResponse.clone()
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseClone)
          })
          return fetchResponse
        })
      }),
    )
    return
  }

  // Network First para APIs
  if (request.url.includes("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200 && request.method === "GET") {
            const responseClone = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          if (request.method === "GET") {
            return caches.match(request)
          }
          throw new Error("Network error and no cache available")
        }),
    )
    return
  }

  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request).then((response) => {
        return response || new Response("", { status: 503, statusText: "Offline" })
      })
    }),
  )
})

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})`

// Generar el Service Worker
const version = generateVersion()
const swContent = swTemplate.replace('{{VERSION}}', version)

// Escribir el archivo
fs.writeFileSync(path.join(__dirname, '../../public/sw.js'), swContent)

console.log('Service Worker generado con versión: ' + version)
