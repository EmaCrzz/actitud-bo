import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  /** Tiene que coincidir con el `id`/`name` del control para que el label lo enfoque. */
  htmlFor: string
  label: string
  /** Mensaje de validación. Su presencia es lo que pinta el campo en rojo. */
  error?: string
  /** Texto de apoyo bajo el campo. Se oculta cuando hay error. */
  hint?: string
  className?: string
  children: ReactNode
}

/**
 * Label + control + mensaje de error de los formularios v2.
 *
 * Nació como `CustomerFormField` en el dominio de clientes (Fase 7) con la nota
 * de que subiría a `components/v2/` cuando lo consumiera un segundo dominio.
 * Eso pasó en la Fase 8: el panel de renovación vive en `membership/` y arma los
 * mismos campos. Es la regla de extracción del ADR de la fase 1 — se comparte
 * cuando hay dos consumidores reales, no cuando parece que podría haberlos.
 *
 * El error se renderiza siempre que exista, sin `aria-live`: aparece como
 * resultado de un submit, no de forma asíncrona, y el foco ya se mueve al
 * primer campo inválido.
 */
export default function FormField({
  htmlFor,
  label,
  error,
  hint,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className='text-sm font-medium' htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p className='text-feedback-error text-xs'>{error}</p>
      ) : hint ? (
        <p className='text-muted-foreground text-xs'>{hint}</p>
      ) : null}
    </div>
  )
}
