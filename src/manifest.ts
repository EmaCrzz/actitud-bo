import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Actitud",
    short_name: "Actitud",
    description: 'PWA para Actitud',
    start_url: '/',
    theme_color: "#ff1168",
    background_color: "#ff1168",
    display: "standalone",
    orientation: "portrait",
    scope: "/",
    icons: [
      {
        src: "/icon/icon1.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/icon/apple-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ],
  }
}