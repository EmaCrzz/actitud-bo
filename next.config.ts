import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Configuración PWA
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
        ],
      },
    ]
  },

  // Optimizaciones para PWA
  experimental: {
    optimizeCss: true,
  },

  // Configuración de imágenes
  images: {
    formats: ["image/webp", "image/avif"],
    unoptimized: true,
  },

  // Ignorar errores durante la construcción
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
