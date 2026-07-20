import type { NextConfig } from "next"
const APP_LANGUAGE = process.env.APP_LANGUAGE
const TENANT = process.env.TENANT

if(!APP_LANGUAGE) {
  throw new Error("APP_LANGUAGE is not defined")
}

if(!TENANT) {
  throw new Error("TENANT is not defined")
}

const nextConfig: NextConfig = {
  // Solo las configuraciones esenciales para PWA
  async headers() {
    return [
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ]
  },
  
  async rewrites(){
    return [
      // Prefija todas las rutas con el idioma y tenant, EXCEPTO las rutas API.
      // Las rutas API viven en la raíz (src/app/api/*) y no deben reescribirse:
      // como este rewrite es `afterFiles` (corre antes de las rutas dinámicas),
      // sin la exclusión capturaba las rutas dinámicas tipo /api/.../[id] y las
      // mandaba a /{lang}/{tenant}/api/... (inexistente) → 404.
      {
        source: '/:path((?!api/).*)',
        destination: `/${APP_LANGUAGE}/${TENANT}/:path`
      }
    ]
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
