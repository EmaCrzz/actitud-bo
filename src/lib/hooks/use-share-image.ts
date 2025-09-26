'use client'

import { toPng } from 'html-to-image'
import { useCallback, useState } from 'react'

interface UseShareImageReturn {
  generateAndShareImage: (elementId: string, filename?: string) => Promise<void>
  isGenerating: boolean
  error: string | null
}

export function useShareImage(): UseShareImageReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateAndShareImage = useCallback(async (elementId: string, filename = 'top-asistencias.png') => {
    setIsGenerating(true)
    setError(null)

    try {
      const element = document.getElementById(elementId)

      if (!element) {
        throw new Error('Element not found')
      }

      // Generate image
      const dataUrl = await toPng(element, {
        quality: 1,
        pixelRatio: 2, // High quality for mobile
        width: 400,
        height: 600,
      })

      // Convert to blob
      // const response = await fetch(dataUrl)
      // const blob = await response.blob()
      // const file = new File([blob], filename, { type: 'image/png' })

      // Always download (comment out share API)
      // if (navigator.share && navigator.canShare?.({ files: [file] })) {
      //   await navigator.share({
      //     title: 'Top de asistencias del mes',
      //     text: '¡Mira quiénes son los más dedicados este mes!',
      //     files: [file],
      //   })
      // } else {
        // Download
        const link = document.createElement('a')

        link.download = filename
        link.href = dataUrl
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      // }
    } catch (err) {
      console.error('Error generating/sharing image:', err)
      setError(err instanceof Error ? err.message : 'Error generando imagen')
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return {
    generateAndShareImage,
    isGenerating,
    error,
  }
}