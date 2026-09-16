import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepperProps {
  /** Etiquetas de cada paso, en orden. */
  steps: string[]
  /** Índice del paso actual (0-based). Los anteriores se marcan completados. */
  current: number
}

// Indicador de pasos de los formularios multi-step. Forma tomada de las capturas
// del 2026-09-15 (alta de cliente y renovación de membresía): círculo numerado,
// línea de progreso, etiqueta debajo, y check verde en los pasos ya completados.
export default function Stepper({ steps, current }: StepperProps) {
  return (
    <div className='flex flex-col gap-2'>
      <ol className='flex items-center'>
        {steps.map((label, index) => {
          const isDone = index < current
          const isCurrent = index === current
          const isLast = index === steps.length - 1

          return (
            <li key={label} className={cn('flex items-center', !isLast && 'flex-1')}>
              <span
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  isDone && 'bg-feedback-success text-white',
                  // `bg-primary`, no `bg-primary-500`: el @theme de globals.css
                  // mapea la escala sin guion antes del número (primary300,
                  // primary400, primary, primary600…), así que `bg-primary-500`
                  // no genera utilidad y el círculo queda transparente.
                  isCurrent && 'bg-primary text-primary-contrast',
                  !isDone && !isCurrent && 'bg-muted text-muted-foreground'
                )}
              >
                {isDone ? <Check aria-hidden className='size-4' /> : index + 1}
              </span>
              {!isLast && (
                <span
                  aria-hidden
                  className={cn(
                    'mx-2 h-0.5 flex-1 rounded',
                    isDone ? 'bg-feedback-success' : 'bg-muted'
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
      <div className='flex items-center justify-between'>
        {steps.map((label, index) => (
          <span
            key={label}
            className={cn(
              'text-xs',
              index < current && 'text-feedback-success font-medium',
              index === current && 'text-foreground font-medium',
              index > current && 'text-muted-foreground'
            )}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
