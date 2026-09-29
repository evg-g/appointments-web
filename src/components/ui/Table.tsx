import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/**
 * Thin semantic table primitives. Real `<table>` markup (so screen readers get row/column
 * relationships) with token-based styling. `numeric` cells use tabular figures for aligned columns.
 */
export function Table({ className, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-line">
      <table className={cn("w-full border-collapse text-sm", className)} {...rest} />
    </div>
  );
}

export function THead({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-sunken text-left", className)} {...rest} />;
}

export function TBody({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...rest} />;
}

export function TR({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b border-line last:border-0", className)} {...rest} />;
}

export interface CellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}

export function TH({
  className,
  numeric,
  scope = "col",
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      scope={scope}
      className={cn(
        "px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted",
        numeric === true && "text-right tabular-nums",
        className,
      )}
      {...rest}
    />
  );
}

export function TD({ className, numeric, ...rest }: CellProps) {
  return (
    <td
      className={cn("px-3 py-2 text-fg", numeric === true && "text-right tabular-nums", className)}
      {...rest}
    />
  );
}
