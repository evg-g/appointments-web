# 2. Design tokens first, themed with CSS custom properties

- Status: accepted
- Date: 2026-09-28

## Context

The UI quality bar (spec §6) is explicit: define design tokens first, let every component consume
them, and forbid raw hex or arbitrary pixel values in components. It also requires light and dark
themes that respect `prefers-color-scheme` plus a user override, and it targets WCAG 2.2 AA. The
easy failure mode — the one most generated apps hit — is scattering ad-hoc colors and spacings
through components so the design cannot be changed in one place and dark mode is bolted on later.

## Decision

Two layers of tokens in `src/styles/tokens.css`:

1. **Primitive scales** — raw color ramps, an 8px-rhythm spacing scale, a type scale, radii,
   elevation, and motion. These never change between themes and are not consumed directly by
   components.
2. **Semantic tokens** — `--color-bg`, `--color-surface`, `--color-text`, `--color-accent`,
   status colors, etc. Components consume only these. They are redefined for dark mode both under
   `@media (prefers-color-scheme: dark)` (guarded so a forced-light override wins) and under
   `:root[data-theme="dark"]` (a forced-dark override).

Because the semantic tokens flip at the custom-property level, a single utility like `bg-surface`
recolors automatically when the theme changes — components need almost no `dark:` variants.

Tailwind v4 is wired with an `@theme inline` block that maps the semantic tokens onto Tailwind's
utility names, so `bg-surface`, `text-fg`, `rounded-md`, and `shadow-md` all resolve to tokens.
`inline` is essential: it emits `var(--token)` into each utility instead of copying a fixed value,
which is what lets the utilities re-resolve at runtime when the theme attribute flips.

Theme selection lives in `src/theme/`: a provider that defaults to the OS, honours a stored user
override, and writes `data-theme` on `<html>`. A tiny inline script in `index.html` applies the
stored preference before first paint to avoid a flash of the wrong theme.

## Consequences

- The palette, spacing, and motion can be changed in one file; components never hardcode values.
- Dark mode is not a fork of the styles — it is the same components reading flipped tokens.
- A design-review rule ("tokens only") is enforceable because raw values in components stand out.
- Self-hosted Inter (via `@fontsource-variable/inter`) keeps the typographic voice deliberate with
  no external font service, consistent with the project's no-external-services stance.
