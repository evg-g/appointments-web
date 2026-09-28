import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/cn";

export type AlertVariant = "info" | "success" | "warning" | "danger";

const VARIANT_STYLES: Record<AlertVariant, string> = {
  info: "bg-info-bg text-info-fg border-info/30",
  success: "bg-success-bg text-success-fg border-success/30",
  warning: "bg-warning-bg text-warning-fg border-warning/30",
  danger: "bg-danger-bg text-danger-fg border-danger/30",
};

const VARIANT_ICON: Record<AlertVariant, ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children?: ReactNode;
  className?: string;
  /** Hide the leading icon (e.g. in a dense list). */
  hideIcon?: boolean;
}

/**
 * A status message. Errors and warnings announce assertively (`role="alert"`); info and success
 * announce politely (`role="status"`), so a success toast never interrupts a screen-reader user.
 */
export function Alert({
  variant = "info",
  title,
  children,
  className,
  hideIcon = false,
}: AlertProps) {
  const Icon = VARIANT_ICON[variant];
  const assertive = variant === "danger" || variant === "warning";

  return (
    <div
      role={assertive ? "alert" : "status"}
      className={cn("flex gap-3 rounded-md border p-3 text-sm", VARIANT_STYLES[variant], className)}
    >
      {!hideIcon && <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
      <div className="flex flex-col gap-0.5">
        {title !== undefined && <p className="font-medium">{title}</p>}
        {children !== undefined && <div className="text-fg/90">{children}</div>}
      </div>
    </div>
  );
}
