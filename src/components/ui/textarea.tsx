import type * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { InfoIcon } from 'lucide-react'

const textareaVariants = cva(
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

export interface TextareaProps
  extends Omit<React.ComponentProps<'textarea'>, 'className'>,
    VariantProps<typeof textareaVariants> {
  className?: string
  helperText?: string
  isInvalid?: boolean
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

function Textarea({
  className,
  variant,
  helperText,
  isInvalid,
  ...props
}: TextareaProps) {
  const textareaElement = (
    <textarea
      className={cn(
        textareaVariants({ variant }),
        !isInvalid && !helperText ? 'mb-[20px]' : '',
        'min-h-16 resize-y',
        className
      )}
      data-slot='textarea'
      {...props}
    />
  )

  const helperTextElement = helperText && <HelperText isInvalid={isInvalid} text={helperText} />

  return (
    <div>
      {textareaElement}
      {helperTextElement}
    </div>
  )
}

export { Textarea, textareaVariants }
