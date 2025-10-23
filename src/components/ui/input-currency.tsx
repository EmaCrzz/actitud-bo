'use client'

import type * as React from 'react'
import type { CurrencyInputOnChangeValues } from 'react-currency-input-field'
import { forwardRef, useState, useEffect } from 'react'
import CurrencyInput from 'react-currency-input-field'
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
        default: 'px-0 py-0',
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
        class: 'pl-0 pr-2 py-0',
      },
      {
        variant: 'line',
        hasComponentLeft: true,
        class: 'pl-0 pr-0 py-[0.5px]',
      },
      {
        variant: 'default',
        hasComponentRight: true,
        class: 'pl-2 pr-0 py-0',
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
        class: 'pl-0 pr-0 py-0',
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

export interface InputCurrencyProps
  extends Omit<React.ComponentProps<'input'>, 'className' | 'onChange' | 'value' | 'defaultValue'>,
    VariantProps<typeof inputVariants> {
  className?: string
  componentLeft?: React.ReactNode
  componentRight?: React.ReactNode
  helperText?: string
  isInvalid?: boolean
  isDisabled?: boolean
  prefix?: string
  suffix?: string
  decimalSeparator?: string
  groupSeparator?: string
  decimalsLimit?: number
  allowDecimals?: boolean
  allowNegativeValue?: boolean
  disableAbbreviations?: boolean
  disableGroupSeparators?: boolean
  value?: number | string
  defaultValue?: number | string
  onValueChange?: (
    value: string | undefined,
    name?: string,
    values?: CurrencyInputOnChangeValues
  ) => void
  minValue?: number
  maxValue?: number
}

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

const InputCurrency = forwardRef<HTMLInputElement, InputCurrencyProps>(
  (
    {
      className,
      variant,
      componentLeft,
      componentRight,
      helperText,
      isInvalid,
      isDisabled = false,
      prefix = '$',
      decimalSeparator = ',',
      groupSeparator = '.',
      decimalsLimit = 2,
      allowDecimals = true,
      allowNegativeValue = false,
      disableAbbreviations = true,
      disableGroupSeparators = false,
      value,
      defaultValue,
      onValueChange,
      minValue,
      maxValue,
      name,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState<string | undefined>(() => {
      if (value !== undefined) {
        return typeof value === 'string' ? value : String(value)
      }
      if (defaultValue !== undefined) {
        return typeof defaultValue === 'string' ? defaultValue : String(defaultValue)
      }

      return undefined
    })

    const [internalError, setInternalError] = useState<string>('')
    const [numericValue, setNumericValue] = useState<string>('')

    useEffect(() => {
      if (value !== undefined) {
        setInternalValue(typeof value === 'string' ? value : String(value))
      }
    }, [value])

    const handleValueChange = (
      val: string | undefined,
      fieldName?: string,
      values?: CurrencyInputOnChangeValues
    ) => {
      const currentNumericValue = values?.float || 0

      // Actualizar el valor numérico para el input hidden
      setNumericValue(
        values?.float !== null && values?.float !== undefined ? String(values.float) : ''
      )

      // Validaciones internas
      if (minValue !== undefined && currentNumericValue < minValue) {
        setInternalError(
          `El valor debe ser mayor o igual a ${prefix}${minValue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`
        )
      } else if (maxValue !== undefined && currentNumericValue > maxValue) {
        setInternalError(
          `El valor debe ser menor o igual a ${prefix}${maxValue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`
        )
      } else {
        setInternalError('')
      }

      // Si es controlado (tiene value prop), no actualizar estado interno
      if (value === undefined) {
        setInternalValue(val)
      }

      // Llamar al callback si existe
      onValueChange?.(val, fieldName || name, values)
    }

    const hasComponents = componentLeft || componentRight
    const showError = isInvalid || !!internalError
    const displayHelperText = helperText || internalError

    const inputField = (
      <>
        <CurrencyInput
          ref={ref}
          allowDecimals={allowDecimals}
          allowNegativeValue={allowNegativeValue}
          autoComplete='off'
          className={cn(
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
          decimalSeparator={decimalSeparator}
          decimalsLimit={decimalsLimit}
          disableAbbreviations={disableAbbreviations}
          disableGroupSeparators={disableGroupSeparators}
          disabled={isDisabled}
          groupSeparator={groupSeparator}
          prefix={prefix}
          value={value !== undefined ? value : internalValue}
          onValueChange={handleValueChange}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...(props as any)}
        />
        {name && <input name={name} type='hidden' value={numericValue} />}
      </>
    )

    const helperTextElement = displayHelperText && (
      <HelperText isInvalid={showError} text={internalError || helperText || ''} />
    )

    if (!hasComponents) {
      return (
        <div className={cn(!showError && !displayHelperText ? 'mb-[20px]' : '')}>
          {inputField}
          {helperTextElement}
        </div>
      )
    }

    return (
      <div className={cn(!showError && !displayHelperText ? 'mb-[20px]' : '')}>
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
)

InputCurrency.displayName = 'InputCurrency'

export { InputCurrency, inputVariants }
