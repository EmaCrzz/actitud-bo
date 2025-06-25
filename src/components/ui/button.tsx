import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "trasition-all inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[4px] text-sm font-medium transition-all disabled:pointer-events-none disabled:text-white disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 border-[0.5px] border-white",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border-[0.5px] bg-input shadow-xs hover:bg-input/70 hover:text-white/70",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost:
          "hover:text-white/70",
        link: "text-primary underline-offset-4 hover:underline disabled:bg-transparent! text-primary200!",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-[4px] gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-[4px] px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  loadingText = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }), loading && "bg-primary/60 border border-white", disabled && "disabled:bg-primary/20")}
      data-slot="button"
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <div className="flex space-x-1">
            <div className="size-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="size-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="size-2 bg-white rounded-full animate-bounce" />
          </div>
         
          {children && (
            <span className="opacity-70">
              {loading && loadingText ? loadingText : children}
            </span>
          )}
        </div>
      ) : (
        children
      )}
    </Comp>
  );
}
Button.displayName = "Button";

export { Button, buttonVariants };
