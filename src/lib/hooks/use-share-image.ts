'use client'

import { useCallback, useState } from 'react'

export interface ShareImageOptions {
  /**
   * Tamaño forzado del PNG. **Omitirlos deja que `toPng` mida el elemento**,
   * que es lo que necesita cualquier contenido de alto variable — el
   * comprobante de pago crece o se achica según cuántas filas tenga el
   * desglose. El top de asistencias los pasa explícitos porque su encuadre
   * está calibrado a mano.
   */
  width?: number
  height?: number
  /**
   * `true` intenta el share nativo del sistema (la hoja de WhatsApp, Mail,
   * etc.) y cae a la descarga si el browser no lo soporta o el usuario lo
   * cancela. `false` —el default— descarga directo, que es el comportamiento
   * que el top de asistencias tiene en producción.
   */
  share?: boolean
  /** Título y texto del share nativo. Ignorados si `share` es false. */
  title?: string
  text?: string
}

interface UseShareImageReturn {
  generateAndShareImage: (
    elementId: string,
    filename?: string,
    options?: ShareImageOptions
  ) => Promise<void>
  isGenerating: boolean
  error: string | null
}

export function useShareImage(): UseShareImageReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateAndShareImage = useCallback(
    async (
      elementId: string,
      filename = 'top-asistencias.png',
      { width = 400, height = 600, share = false, title, text }: ShareImageOptions = {}
    ) => {
      setIsGenerating(true)
      setError(null)

      try {
        // Dynamic import para reducir bundle size inicial
        const { toPng } = await import('html-to-image')

        const element = document.getElementById(elementId)

        if (!element) {
          throw new Error('Element not found')
        }

        // Generate image
        const dataUrl = await toPng(element, {
          quality: 1,
          pixelRatio: 2, // High quality for mobile
          width,
          height,
        })

        if (share && (await shareAsFile(dataUrl, filename, title, text))) return

        downloadDataUrl(dataUrl, filename)
      } catch (err) {
        console.error('Error generating/sharing image:', err)
        setError(err instanceof Error ? err.message : 'Error generando imagen')
      } finally {
        setIsGenerating(false)
      }
    },
    []
  )

  return {
    generateAndShareImage,
    isGenerating,
    error,
  }
}

/**
 * Share nativo con el archivo adjunto. Devuelve `false` cuando no está
 * disponible, para que el llamador descargue en su lugar.
 *
 * El `AbortError` se traga a propósito: es el usuario cerrando la hoja de
 * compartir, no un fallo — y descargarle el archivo igual, o peor mostrarle un
 * error, es responder a "no quiero" con "acá tenés".
 */
async function shareAsFile(
  dataUrl: string,
  filename: string,
  title?: string,
  text?: string
): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false

  const blob = await (await fetch(dataUrl)).blob()
  const file = new File([blob], filename, { type: 'image/png' })

  if (!navigator.canShare({ files: [file] })) return false

  try {
    await navigator.share({ files: [file], title, text })

    return true
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return true

    return false
  }
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a')

  link.download = filename
  link.href = dataUrl
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
