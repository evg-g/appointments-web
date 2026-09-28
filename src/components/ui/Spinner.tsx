import { cn } from "@/lib/cn";

const SIZES = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
} as const;

export interface SpinnerProps {
  size?: keyof typeof SIZES;
  className?: string;
  /** Announced to assistive tech. Set to "" and provide an external label to silence it. */
  label?: string;
}

/** An accessible loading indicator. Inherits color from `currentColor`, so it tints to context. */
export function Spinner({ size = "md", className, label = "Loading" }: SpinnerProps) {
  return (
    <span role="status" aria-live="polite" className={cn("inline-flex", className)}>
      <svg
        className={cn("animate-spin text-current", SIZES[size])}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {label !== "" && <span className="sr-only">{label}</span>}
    </span>
  );
}
