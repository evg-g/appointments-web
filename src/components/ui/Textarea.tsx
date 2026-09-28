import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import { describedBy, useFieldContext } from "./field-context";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

/** Native textarea styled to match Input, wired to FieldContext for id/ARIA. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    className,
    invalid,
    id,
    "aria-invalid": ariaInvalid,
    "aria-describedby": ariaDescribedBy,
    rows = 3,
    ...rest
  },
  ref,
) {
  const field = useFieldContext();
  const isInvalid = invalid ?? ariaInvalid ?? field?.invalid ?? false;

  return (
    <textarea
      ref={ref}
      id={id ?? field?.fieldId}
      rows={rows}
      aria-invalid={isInvalid || undefined}
      aria-describedby={ariaDescribedBy ?? describedBy(field)}
      className={cn(
        "w-full rounded-md border bg-surface px-3 py-2 text-sm text-fg",
        "placeholder:text-subtle transition-colors focus:border-accent",
        "disabled:cursor-not-allowed disabled:opacity-60",
        isInvalid ? "border-danger focus:border-danger" : "border-line",
        className,
      )}
      {...rest}
    />
  );
});
