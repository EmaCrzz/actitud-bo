'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useTranslations } from '@/lib/i18n/context'

// Cliente: detecta ?error=unauthorized en la URL (proveniente del guard
// server-side) y muestra un toast. Después limpia el query param para que
// un refresh no vuelva a disparar el toast.
export default function UnauthorizedToast() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t } = useTranslations()

  useEffect(() => {
    if (searchParams.get('error') !== 'unauthorized') return

    toast.error(t('auth.accessDenied'), {
      description: t('auth.accessDeniedDescription'),
    })

    // Sacar el query param sin agregar entrada al history
    const params = new URLSearchParams(searchParams.toString())

    params.delete('error')
    const newUrl = params.toString() ? `/?${params.toString()}` : '/'

    router.replace(newUrl, { scroll: false })
  }, [searchParams, router, t])

  return null
}
