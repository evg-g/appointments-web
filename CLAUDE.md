# CLAUDE.md — appointments-web conventions

Read this before changing anything in this repo.

## What this repo is

React 19 + TypeScript (strict) front end for Aurora Clinic, built with Vite.

## Rules

- `tsc --noEmit` and ESLint must pass. No `any`. No non-null `!` without a justifying comment.
- The API client is **generated** from the backend `openapi.json` (from milestone 12) —
  hand-written request types are forbidden.
- Network is mocked at the network layer with MSW, shared between Vitest, Storybook, and the
  dev server. No hand-rolled `fetch` mocks.
- Every async surface has four designed states: loading (skeleton), empty (with a next
  action), error (with retry), success.
- Design tokens first (`src/styles/tokens.css`); components consume tokens, never raw hex or
  arbitrary pixels.
- Accessibility: keyboard operable, visible focus, correct ARIA, WCAG 2.2 AA, axe-clean.

## Commands

```bash
make setup / make dev / make test / make lint / make fix / make ci-local
```

## Testing

- Unit: Vitest (hooks, formatters, schemas).
- Component: Vitest + Testing Library + MSW; query by role/label.
- E2E: Playwright against the composed stack (from milestone 14).
