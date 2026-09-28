import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names, with later Tailwind utilities winning over conflicting earlier ones
 * (e.g. `cn("px-2", condition && "px-4")` yields `px-4`). Used by every primitive so callers
 * can override styling without specificity fights.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
