"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HybridSelectProps {
  options: Array<{ value: string; label: string }>;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}

export function HybridSelect({
  options,
  name,
  defaultValue,
  placeholder,
  className,
}: HybridSelectProps) {
  const [value, setValue] = React.useState(defaultValue || "");

  return (
    <>
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
    </>
  );
}
