import { useId } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { FieldContext } from "./field-context";

export interface FieldProps {
  label: string;
  /** The control(s) this field wraps. They inherit id/ARIA via FieldContext. */
  children: ReactNode;
  description?: string | undefined;
  /** Error text; when present the control is marked invalid and this is announced. */
  error?: string | undefined;
  required?: boolean | undefined;
  className?: string | undefined;
  /** Override the generated id (otherwise a stable useId value is used). */
  id?: string | undefined;
}

/**
 * A labelled form field. Owns the id and the description/error ids, and exposes them through
 * FieldContext so the control inside is correctly associated for assistive tech — the caller
 * only supplies text.
 */
export function Field({
  label,
  children,
  description,
  error,
  required,
  className,
  id,
}: FieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const descriptionId = description !== undefined ? `${fieldId}-description` : undefined;
  const errorId = error !== undefined ? `${fieldId}-error` : undefined;
  const invalid = error !== undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={fieldId} className="text-sm font-medium text-fg">
        {label}
        {required === true && (
          <span className="text-danger-fg" aria-hidden="true">
            {" *"}
          </span>
        )}
      </label>

      <FieldContext.Provider value={{ fieldId, descriptionId, errorId, invalid }}>
        {children}
      </FieldContext.Provider>

      {description !== undefined && (
        <p id={descriptionId} className="text-sm text-muted">
          {description}
        </p>
      )}
      {error !== undefined && (
        <p id={errorId} className="text-sm text-danger-fg">
          {error}
        </p>
      )}
    </div>
  );
}
