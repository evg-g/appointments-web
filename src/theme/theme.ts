/**
 * Theme model shared by the provider, the hook, and the no-FOUC bootstrap script.
 *
 * `ThemePreference` is what the user chooses; `system` defers to the OS. `ResolvedTheme` is the
 * concrete light/dark the app is actually showing, which JS consumers (e.g. charts later) need.
 */
export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "aurora.theme";

const PREFERENCES: readonly ThemePreference[] = ["light", "dark", "system"];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (PREFERENCES as readonly string[]).includes(value);
}

/** The OS preference right now. Falls back to light where matchMedia is unavailable (SSR/tests). */
export function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? systemTheme() : preference;
}

/**
 * Write the chosen theme to <html>. For `system` we remove the attribute so the CSS
 * `prefers-color-scheme` media query drives the tokens; otherwise we pin it.
 */
export function applyTheme(preference: ThemePreference): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (preference === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", preference);
  }
}

export function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(raw) ? raw : "system";
  } catch {
    // localStorage can throw in private mode / when disabled.
    return "system";
  }
}
