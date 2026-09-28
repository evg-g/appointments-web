import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  applyTheme,
  readStoredPreference,
  resolveTheme,
  systemTheme,
  THEME_STORAGE_KEY,
} from "./theme";
import type { ResolvedTheme, ThemePreference } from "./theme";
import { ThemeContext } from "./theme-context";

interface ThemeProviderProps {
  children: ReactNode;
  /** Force an initial preference (used by Storybook and tests). Defaults to the stored value. */
  initial?: ThemePreference;
}

export function ThemeProvider({ children, initial }: ThemeProviderProps): ReactNode {
  const [preference, setPreferenceState] = useState<ThemePreference>(
    () => initial ?? readStoredPreference(),
  );
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(preference));

  // Reflect the preference onto <html> and recompute the resolved theme whenever it changes.
  useEffect(() => {
    applyTheme(preference);
    setResolved(resolveTheme(preference));
  }, [preference]);

  // While following the OS, react live to the user flipping their system theme.
  useEffect(() => {
    if (preference !== "system") return;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (): void => setResolved(systemTheme());
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Non-fatal: the theme still applies for this session.
    }
  }, []);

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
