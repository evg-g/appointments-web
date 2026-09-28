import { Inbox } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** An icon component (lucide). Defaults to an inbox. */
  icon?: ComponentType<{ className?: string }>;
  /** The next action — usually a Button — so the state is never a dead end. */
  action?: ReactNode;
  className?: string;
}

/** Shown when a successful request returns nothing. Always offers a next step. */
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line p-8 text-center",
        className,
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-sunken text-muted">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-medium text-fg">{title}</p>
        {description !== undefined && <p className="text-sm text-muted">{description}</p>}
      </div>
      {action !== undefined && <div className="mt-1">{action}</div>}
    </div>
  );
}
