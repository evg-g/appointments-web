import { useId, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
}

export interface TabsProps<T extends string> {
  /** Accessible name of the tablist, e.g. "Appointments". */
  label: string;
  items: readonly TabItem<T>[];
  /** The selected tab. */
  value: T;
  onValueChange: (value: T) => void;
  /** Content of the selected tab's panel. */
  children: ReactNode;
  className?: string;
}

/**
 * Accessible tabs (WAI-ARIA tabs pattern, automatic activation): a tablist of tab buttons and one
 * tabpanel for the selected tab. Only the selected tab is in the tab order (roving tabindex);
 * ArrowLeft / ArrowRight move to the previous / next tab and wrap at both ends, Home / End go to
 * the first / last tab. Moving focus also selects the tab. Controlled: the caller owns `value`.
 */
export function Tabs<T extends string>({
  label,
  items,
  value,
  onValueChange,
  children,
  className,
}: TabsProps<T>) {
  const baseId = useId();
  const tabRefs = useRef(new Map<T, HTMLButtonElement>());
  const tabId = (v: T) => `${baseId}-tab-${v}`;
  const panelId = (v: T) => `${baseId}-panel-${v}`;

  const moveTo = (index: number) => {
    const item = items[index];
    if (item === undefined) return;
    onValueChange(item.value);
    tabRefs.current.get(item.value)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const count = items.length;
    if (count === 0) return;
    const current = Math.max(
      0,
      items.findIndex((item) => item.value === value),
    );
    let next: number;
    switch (event.key) {
      case "ArrowRight":
        next = (current + 1) % count;
        break;
      case "ArrowLeft":
        next = (current - 1 + count) % count;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = count - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    moveTo(next);
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div
        role="tablist"
        aria-label={label}
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        className="flex flex-wrap gap-1 border-b border-line"
      >
        {items.map((item) => {
          const selected = item.value === value;
          return (
            <button
              key={item.value}
              ref={(node) => {
                if (node === null) tabRefs.current.delete(item.value);
                else tabRefs.current.set(item.value, node);
              }}
              type="button"
              role="tab"
              id={tabId(item.value)}
              aria-selected={selected}
              aria-controls={selected ? panelId(item.value) : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => onValueChange(item.value)}
              className={cn(
                "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                selected
                  ? "border-accent text-fg"
                  : "border-transparent text-muted hover:border-line hover:text-fg",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={panelId(value)} aria-labelledby={tabId(value)} tabIndex={0}>
        {children}
      </div>
    </div>
  );
}
