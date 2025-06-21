import type * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { InfoIcon } from "lucide-react";

const inputVariants = cva(
  "placeholder:text-muted-foreground selection:text-primary-foreground flex w-full min-w-0 text-base transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm px-2 py-4",
  {
    variants: {
      variant: {
        default: [
          "border border-borderinput shadow-xs rounded-[4px] bg-input",
          "focus-within:border-inputactive",
        ],
        line: [
          "border-0 border-b-[0.5px] border-b-primary200 bg-transparent rounded-none hover:border-b-primary",
          "focus-within:border-b-primary focus-within:border-b-primary",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

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
  }
);

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "className">,
    VariantProps<typeof inputVariants> {
  className?: string;
  componentLeft?: React.ReactNode;
  componentRight?: React.ReactNode;
  helperText?: string;
  isInvalid?: boolean;
}

// Componente helper para renderizar los iconos/componentes laterales
function InputComponent({
  children,
  position,
}: {
  children: React.ReactNode;
  position: "left" | "right";
}) {
  return (
    <div
      className={`flex items-center justify-center text-muted-foreground shrink-0 ${position}`}
    >
      {children}
    </div>
  );
}

// Componente helper para el texto de ayuda
function HelperText({
  text,
  isInvalid,
}: {
  text: string;
  isInvalid?: boolean;
}) {
  return (
    <small
      className={cn(
        "text-xs font-light flex gap-1 pt-1",
        isInvalid ? "text-destructive" : "text-muted-foreground"
      )}
    >
      {isInvalid && <InfoIcon className="size-4" />}
      {text}
    </small>
  );
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
  const hasComponents = componentLeft || componentRight;

  // Input field común
  const inputField = (
    <input
      autoComplete="off"
      type={type}
      className={cn(
        !isInvalid && !helperText ? "mb-[20px]" : "",
        hasComponents
          ? inputFieldVariants({ variant, hasComponentLeft: !!componentLeft })
          : inputVariants({ variant })
      )}
      data-slot={hasComponents ? undefined : "input"}
      {...props}
    />
  );

  // Helper text común
  const helperTextElement = helperText && (
    <HelperText text={helperText} isInvalid={isInvalid} />
  );

  // Si no hay componentes laterales, renderizar input simple
  if (!hasComponents) {
    return (
      <div>
        {inputField}
        {helperTextElement}
      </div>
    );
  }

  // Renderizar con wrapper para componentes laterales
  return (
    <div>
      <div
        className={cn(
          inputVariants({ variant }),
          "items-center gap-2",
          className
        )}
        data-slot="input-wrapper"
      >
        {componentLeft && (
          <InputComponent position="left">{componentLeft}</InputComponent>
        )}

        {inputField}

        {componentRight && (
          <InputComponent position="right">{componentRight}</InputComponent>
        )}
      </div>
      {helperTextElement}
    </div>
  );
}

export { Input, inputVariants };
