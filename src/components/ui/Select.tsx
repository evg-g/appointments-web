import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import { describedBy, useFieldContext } from "./field-context";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Mark the control invalid. Usually inherited from an enclosing Field's `error`. */
  invalid?: boolean;
}

/** Native select styled to match Input, wired to FieldContext for id/ARIA. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    className,
    invalid,
    id,
    "aria-invalid": ariaInvalid,
    "aria-describedby": ariaDescribedBy,
    children,
    ...rest
  },
  ref,
) {
  const field = useFieldContext();
  const isInvalid = invalid ?? ariaInvalid ?? field?.invalid ?? false;

  return (
    <select
      ref={ref}
      id={id ?? field?.fieldId}
      aria-invalid={isInvalid || undefined}
      aria-describedby={ariaDescribedBy ?? describedBy(field)}
      className={cn(
        "h-10 w-full rounded-md border bg-surface px-3 text-sm text-fg",
        "transition-colors focus:border-accent",
        "disabled:cursor-not-allowed disabled:opacity-60",
        isInvalid ? "border-danger focus:border-danger" : "border-line",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
});
