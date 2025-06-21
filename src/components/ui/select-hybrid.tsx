"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { InfoIcon } from "lucide-react";

interface HybridSelectProps {
  options: Array<{ value: string; label: string }>;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  isInvalid?: boolean;
  helperText?: string;
}

export function HybridSelect({
  options,
  name,
  defaultValue,
  placeholder,
  className,
  helperText,
  isInvalid = false,
}: HybridSelectProps) {
  const [value, setValue] = React.useState(defaultValue || "");

  return (
    <div className={cn(!isInvalid && !helperText ? "mb-[20px]" : "")}>
      {/* Hidden input para el formulario no controlado */}
      <input type="hidden" name={name} value={value} />

      {/* Select visual de shadcn/ui */}
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {helperText && (
        <small
          className={cn(
            "text-xs font-light flex gap-1 pt-1",
            isInvalid ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {isInvalid ? <InfoIcon className="size-4" /> : null}
          {helperText}
        </small>
      )}
    </div>
  );
}
