import { createContext, useContext } from "react";

/**
 * Lets a form control (Input, Select, ...) inherit the id and ARIA wiring from its enclosing
 * Field without the caller threading those props by hand. This is what keeps label association,
 * `aria-describedby`, and `aria-invalid` correct and consistent.
 */
export interface FieldContextValue {
  fieldId: string;
  descriptionId: string | undefined;
  errorId: string | undefined;
  invalid: boolean;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

export function useFieldContext(): FieldContextValue | null {
  return useContext(FieldContext);
}

/** Space-separated id list for `aria-describedby`, or undefined when there is nothing to point at. */
export function describedBy(field: FieldContextValue | null): string | undefined {
  if (field === null) return undefined;
  const ids = [field.descriptionId, field.errorId].filter((id): id is string => id !== undefined);
  return ids.length > 0 ? ids.join(" ") : undefined;
}
