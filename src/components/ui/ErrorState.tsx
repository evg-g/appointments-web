import { AlertTriangle, RotateCw } from "lucide-react";

import { cn } from "@/lib/cn";

import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message: string;
  /** When provided, a retry button is shown. */
  onRetry?: () => void;
  retryLabel?: string;
  /** Retry is in flight. */
  retrying?: boolean;
  className?: string;
}

/** The error branch of an async surface: explains what went wrong and offers a retry. */
export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
  retrying = false,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-danger/30 bg-danger-bg p-8 text-center",
        className,
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-danger/15 text-danger-fg">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-medium text-danger-fg">{title}</p>
        <p className="text-sm text-danger-fg/90">{message}</p>
      </div>
      {onRetry !== undefined && (
        <Button variant="secondary" size="sm" onClick={onRetry} loading={retrying} className="mt-1">
          {!retrying && <RotateCw className="size-4" aria-hidden="true" />}
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
