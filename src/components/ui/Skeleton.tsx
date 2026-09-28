import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/**
 * A shimmering placeholder for content being loaded. Decorative (`aria-hidden`) — the surrounding
 * async region should carry the actual loading announcement. The shimmer stops under
 * `prefers-reduced-motion` (see global.css).
 */
export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton", className)} aria-hidden="true" {...rest} />;
}

export interface SkeletonTextProps {
  /** Number of placeholder lines. */
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={cn("h-4", index === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}
