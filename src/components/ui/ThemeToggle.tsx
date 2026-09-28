import { Monitor, Moon, Sun } from "lucide-react";
import type { ComponentType } from "react";

import { cn } from "@/lib/cn";
import type { ThemePreference } from "@/theme/theme";
import { useTheme } from "@/theme/useTheme";

const OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export interface ThemeToggleProps {
  /** Icons only, labels moved to accessible names — for tight spaces like the header. */
  compact?: boolean;
  className?: string;
}

/** A three-way theme control: light, dark, or follow the OS. */
export function ThemeToggle({ compact = false, className }: ThemeToggleProps) {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="group"
      aria-label="Color theme"
      className={cn(
        "inline-flex gap-0.5 rounded-full border border-line bg-sunken p-0.5",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = preference === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={selected}
            aria-label={compact ? label : undefined}
            title={compact ? label : undefined}
            onClick={() => setPreference(value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium transition-colors",
              selected ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {!compact && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
