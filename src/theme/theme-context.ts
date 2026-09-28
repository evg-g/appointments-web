import { createContext } from "react";

import type { ResolvedTheme, ThemePreference } from "./theme";

export interface ThemeContextValue {
  /** What the user selected (may be `system`). */
  preference: ThemePreference;
  /** The concrete theme currently rendered. */
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
