import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import { describedBy, useFieldContext } from "./field-context";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Mark the control invalid. Usually inherited from an enclosing Field's `error`. */
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    invalid,
    id,
    "aria-invalid": ariaInvalid,
    "aria-describedby": ariaDescribedBy,
    ...rest
  },
  ref,
) {
  const field = useFieldContext();
  const isInvalid = invalid ?? ariaInvalid ?? field?.invalid ?? false;

  return (
    <input
      ref={ref}
      id={id ?? field?.fieldId}
      aria-invalid={isInvalid || undefined}
      aria-describedby={ariaDescribedBy ?? describedBy(field)}
      className={cn(
        "h-10 w-full rounded-md border bg-surface px-3 text-sm text-fg",
        "placeholder:text-subtle",
        "transition-colors focus:border-accent",
        "disabled:cursor-not-allowed disabled:opacity-60",
        isInvalid ? "border-danger focus:border-danger" : "border-line",
        className,
      )}
      {...rest}
    />
  );
});
