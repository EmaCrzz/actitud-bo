'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

// Vercel inyecta NEXT_PUBLIC_VERCEL_ENV automáticamente en build time.
// - 'production'  → deploy de main
// - 'preview'     → deploy de develop o feature branches
// - undefined     → npm run dev local
// Solo suprimimos el banner cuando el build es de production.
export default function EnvBanner() {
  const pathname = usePathname()
  const env = process.env.NEXT_PUBLIC_VERCEL_ENV

  if (env === 'production') return null

  // v2 tiene su propio indicador de ambiente en el sidebar (badge junto al brand).
  // Ocultamos el banner global para no duplicar y no descolocar el AppShell.
  if (pathname?.includes('/v2/') || pathname?.endsWith('/v2')) return null

  // fixed para no consumir una row del grid del <body> y así no descolocar
  // los loaders / páginas que dependen de h-dvh. El layout compensa con
  // padding-top del mismo alto (h-7 = 28px) solo cuando este banner se
  // muestra — ver src/app/[lang]/[tenant]/layout.tsx.
  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 h-7',
        'flex items-center justify-center',
        'text-center text-xs font-semibold',
        'bg-yellow-400 text-yellow-950',
        'border-b border-yellow-500'
      )}
      role='alert'
    >
      DEV — Ambiente de pruebas. Los cambios no afectan producción.
    </div>
  )
}
