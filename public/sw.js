// Service Worker básico para PWA
self.addEventListener('install', (_event) => {
  console.log('Service Worker installing')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating')
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  // Estrategia básica de cache
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  )
})
