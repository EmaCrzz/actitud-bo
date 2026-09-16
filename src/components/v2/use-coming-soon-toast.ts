'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { useTranslations } from '@/lib/i18n/context'

/**
 * Aviso de "esto todavía no existe" para las acciones que el Figma ya dibuja pero
 * cuya fase no llegó — el "Nuevo cliente" del home (Fase 7) y el del listado de
 * clientes, por ahora.
 *
 * Vive acá en una sola definición para que cuando la fase aterrice se puedan
 * encontrar y borrar todos los call sites de una, en vez de dejar toasts
 * huérfanos repartidos por las secciones.
 */
export function useComingSoonToast() {
  const { t } = useTranslations()

  return useCallback(() => {
    toast(t('v2.comingSoon.title'), { description: t('v2.comingSoon.description') })
  }, [t])
}
