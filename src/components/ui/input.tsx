import type * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { InfoIcon } from 'lucide-react'

const inputVariants = cva(
  'placeholder:text-input-placeholder flex w-full min-w-0 text-base transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 px-2 py-3',
  {
    variants: {
      variant: {
        default: [
          'border border-input-border shadow-xs rounded-[4px] bg-input-background',
          'focus-within:border-input-hover-border',
        ],
        line: [
          'border-0 border-b-[0.5px] border-b-primary200 bg-transparent rounded-none hover:border-b-primary',
          'focus-within:border-b-primary focus-within:border-b-primary',
        ],
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const inputFieldVariants = cva(
  'flex-1 bg-transparent border-0 outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'px-2 py-4',
        line: 'px-0 py-1',
      },
      hasComponentLeft: {
        true: '',
        false: '',
      },
      hasComponentRight: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      {
        variant: 'default',
        hasComponentLeft: true,
        class: 'pl-0 pr-2 py-4',
      },
      {
        variant: 'line',
        hasComponentLeft: true,
        class: 'pl-0 pr-0 py-[0.5px]',
      },
      {
        variant: 'default',
        hasComponentRight: true,
        class: 'pl-2 pr-0 py-4',
      },
      {
        variant: 'line',
        hasComponentRight: true,
        class: 'pl-0 pr-0 py-[0.5px]',
      },
      {
        variant: 'default',
        hasComponentLeft: true,
        hasComponentRight: true,
        class: 'pl-0 pr-0 py-4',
      },
      {
        variant: 'line',
        hasComponentLeft: true,
        hasComponentRight: true,
        class: 'pl-0 pr-0 py-[0.5px]',
      },
    ],
    defaultVariants: {
      variant: 'default',
      hasComponentLeft: false,
      hasComponentRight: false,
    },
  }
)

export interface InputProps
  extends Omit<React.ComponentProps<'input'>, 'className'>,
    VariantProps<typeof inputVariants> {
  className?: string
  componentLeft?: React.ReactNode
  componentRight?: React.ReactNode
  helperText?: string
  isInvalid?: boolean
}

// Componente helper para renderizar los iconos/componentes laterales
function InputComponent({
  children,
  position,
}: {
  children: React.ReactNode
  position: 'left' | 'right'
}) {
  return (
    <div
      className={`flex items-center justify-center text-muted-foreground shrink-0 h-fit ${position}`}
    >
      {children}
    </div>
  )
}

// Componente helper para el texto de ayuda
function HelperText({ text, isInvalid }: { text: string; isInvalid?: boolean }) {
  return (
    <small
      className={cn(
        'text-xs font-light flex gap-1 pt-1',
        isInvalid ? 'text-destructive' : 'text-muted-foreground'
      )}
    >
      {isInvalid && <InfoIcon className='size-4' />}
      {text}
    </small>
  )
}

function Input({
  className,
  variant,
  componentLeft,
  componentRight,
  type,
  helperText,
  isInvalid,
  ...props
}: InputProps) {
  const hasComponents = componentLeft || componentRight

  // Input field común
  const inputField = (
    <input
      autoComplete='off'
      className={cn(
        !isInvalid && !helperText ? 'mb-[20px]' : '',
        hasComponents
          ? inputFieldVariants({
              variant,
              hasComponentLeft: !!componentLeft,
              hasComponentRight: !!componentRight,
            })
          : inputVariants({ variant }),
        className
      )}
      data-slot={hasComponents ? undefined : 'input'}
      type={type}
      {...props}
    />
  )

  // Helper text común
  const helperTextElement = helperText && <HelperText isInvalid={isInvalid} text={helperText} />

  // Si no hay componentes laterales, renderizar input simple
  if (!hasComponents) {
    return (
      <div>
        {inputField}
        {helperTextElement}
      </div>
    )
  }

  // Renderizar con wrapper para componentes laterales
  return (
    <div>
      <div
        className={cn(inputVariants({ variant }), 'items-center gap-2')}
        data-slot='input-wrapper'
      >
        {componentLeft && <InputComponent position='left'>{componentLeft}</InputComponent>}

        {inputField}

        {componentRight && <InputComponent position='right'>{componentRight}</InputComponent>}
      </div>
      {helperTextElement}
    </div>
  )
}

export { Input, inputVariants }
