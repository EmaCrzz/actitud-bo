
import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "placeholder:text-muted-foreground selection:text-primary-foreground flex w-full min-w-0 text-base transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm autofill:bg-yellow-200! px-2 py-4",
  {
    variants: {
      variant: {
        default: ["border border-borderinput shadow-xs rounded-[4px] bg-input", "focus-within:border-inputactive"],
        line: [
          "border-0 border-b-[0.5px] border-b-primary200 bg-transparent rounded-none hover:border-b-primary",
          "focus-within:border-b-primary focus-within:border-b-primary",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

const inputFieldVariants = cva(
  "flex-1 bg-transparent border-0 outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "px-2 py-4",
        line: "px-0 py-1",
      },
      hasComponentLeft: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        variant: "default",
        hasComponentLeft: true,
        class: "pl-0 pr-2 py-4",
      },
      {
        variant: "line",
        hasComponentLeft: true,
        class: "pl-0 pr-0 py-[0.5px]",
      },
    ],
    defaultVariants: {
      variant: "default",
      hasComponentLeft: false,
    },
  },
)

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "className">,
    VariantProps<typeof inputVariants> {
  className?: string
  componentLeft?: React.ReactNode
  componentRight?: React.ReactNode
}

function Input({ className, variant, componentLeft, componentRight, type, ...props }: InputProps) {

  if( componentLeft && componentRight) {
    return (
      <div className={cn(inputVariants({ variant }), "items-center gap-2", className)} data-slot="input-wrapper">
        <div className="flex items-center justify-center text-muted-foreground shrink-0">{componentLeft}</div>
        <input autoComplete="off" type={type} className={cn(inputFieldVariants({ variant, hasComponentLeft: true }))} {...props} />
        <div className="flex items-center justify-center text-muted-foreground shrink-0">{componentRight}</div>
      </div>
    )
  }

  if (componentLeft) {
    return (
      <div className={cn(inputVariants({ variant }), "items-center gap-2", className)} data-slot="input-wrapper">
        <div className="flex items-center justify-center text-muted-foreground shrink-0">{componentLeft}</div>
        <input autoComplete="off" type={type} className={cn(inputFieldVariants({ variant, hasComponentLeft: true }))} {...props} />
      </div>
    )
  }

  if (componentRight) {
    return (
      <div className={cn(inputVariants({ variant }), "items-center gap-2", className)} data-slot="input-wrapper">
        <input autoComplete="off" type={type} className={cn(inputFieldVariants({ variant, hasComponentLeft: false }))} {...props} />
        <div className="flex items-center justify-center text-muted-foreground shrink-0">{componentRight}</div>
      </div>
    )
  }



  return <input autoComplete="off" type={type} data-slot="input" className={cn(inputVariants({ variant }), className)} {...props} />
}

export { Input, inputVariants }
