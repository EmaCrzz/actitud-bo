import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Actitud",
    short_name: "Actitud",
    description: 'PWA para actidud',
    start_url: '/',
    theme_color: "#ff1168",
    background_color: "#ff1168",
    display: "standalone",
    icons: [
      {
        src: "/favicon.ico/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/favicon.ico/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ],
  }
}