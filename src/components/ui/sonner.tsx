'use client'

import { Toaster as Sonner, ToasterProps } from 'sonner'

import AlertTriangleContained from '@/components/icons/alert-triangle-contained'
import CheckCircleContained from '@/components/icons/check-circle-contained'

// `richColors` es la API de sonner para colorear por variante: habilita las
// variables --success-*/--error-*/--warning-*, que acá se apuntan a los tokens
// del tenant. Sin el flag, sonner ignora esas variables y pinta todo con
// --normal-*. Los estilos propios de sonner se declaran con selectores de alta
// especificidad ([data-sonner-toast][data-styled='true']), de ahí los `!` en las
// utilidades que pisan tamaño, peso y gap.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      richColors
      className='toaster group'
      icons={{
        // Los SVG traen width/height 40 por defecto: sin `size-6` desbordan el
        // contenedor de 24px que define Figma.
        success: <CheckCircleContained className='size-6' />,
        error: <AlertTriangleContained className='size-6' />,
        // Sin frame propio en Figma: warning reusa el tratamiento de error.
        warning: <AlertTriangleContained className='size-6' />,
      }}
      style={
        {
          '--width': '361px',
          '--border-radius': '4px',
          '--toast-icon-margin-start': '0px',
          '--toast-icon-margin-end': '0px',
          '--normal-bg': 'var(--color-toast-background)',
          '--normal-text': 'var(--color-toast-text)',
          '--normal-border': 'var(--color-toast-border)',
          '--success-bg': 'var(--color-toast-background)',
          '--success-text': 'var(--color-feedback-success)',
          '--success-border': 'var(--color-feedback-success)',
          '--error-bg': 'var(--color-toast-background)',
          '--error-text': 'var(--color-toast-text)',
          '--error-border': 'var(--color-feedback-error)',
          '--warning-bg': 'var(--color-toast-background)',
          '--warning-text': 'var(--color-toast-text)',
          '--warning-border': 'var(--color-feedback-error)',
        } as React.CSSProperties
      }
      theme='dark'
      toastOptions={{
        classNames: {
          toast:
            'font-sans font-light justify-center text-center gap-4! text-base! border-[0.5px]! [&_[data-icon]]:size-6! [&_[data-title]]:font-light!',
          // El texto del error va en blanco (--error-text), así que el ícono
          // necesita el rojo explícito en vez de heredar el color del toast.
          error: '[&_[data-icon]]:text-feedback-error',
          warning: '[&_[data-icon]]:text-feedback-error',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
