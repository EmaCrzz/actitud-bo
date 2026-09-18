import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CustomerFormFieldProps {
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
 * Vive en el dominio y no en `components/v2/` porque hoy lo usa un solo
 * formulario. Cuando el segundo — el de renovación de la Fase 8 — lo necesite,
 * se sube a `src/components/v2/`, que es la regla de extracción del ADR de la
 * fase 1: un componente se comparte cuando lo consumen dos dominios, no cuando
 * parece que alguien podría.
 *
 * El error se renderiza siempre que exista, sin `aria-live`: aparece como
 * resultado de un submit, no de forma asíncrona, y el foco ya se mueve al
 * primer campo inválido.
 */
export default function CustomerFormField({
  htmlFor,
  label,
  error,
  hint,
  className,
  children,
}: CustomerFormFieldProps) {
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
