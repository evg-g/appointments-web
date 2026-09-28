# CLAUDE.md — appointments-web conventions

Read this before changing anything in this repo.

## What this repo is

React 19 + TypeScript (strict) front end for Aurora Clinic, built with Vite and Tailwind v4.
Server state via TanStack Query v5; routing via React Router v7; forms via React Hook Form + Zod;
Radix UI primitives; MSW for network mocking; Storybook for the component workshop.

## Rules

- `tsc --noEmit` and ESLint must pass. No `any`. No non-null `!` without a justifying comment.
- The API client is **generated** from the backend `openapi.json` (`src/api/schema.d.ts` via
  `openapi-typescript`; typed client in `src/api/client.ts`) — hand-written request types are
  forbidden. Run `make check-client` after the contract changes.
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
make storybook / make build-storybook      # component workshop
make vendor-contract / make check-client   # regenerate + drift-gate the API client
```

Run the dev server with mock data: `VITE_ENABLE_MSW=true npm run dev` (seed logins in README).

## Testing

- Unit: Vitest (hooks, formatters, schemas).
- Component: Vitest + Testing Library + MSW; query by role/label.
- E2E / a11y / visual: Playwright under `e2e/` (milestone 14). The specs drive the real build served
  by `vite preview` with the app's MSW backend (`VITE_ENABLE_MSW=true`) — deterministic, no Docker.
  `make e2e` runs journeys + a11y + visual; `make e2e-update-snapshots` regenerates visual baselines
  (Chromium-on-Linux, committed). Force error states through the MSW `scenarios` map, never a
  hand-rolled mock. Running against the composed stack is milestone 15. See
  `docs/BROWSER_TESTING.md` + ADR 0006.
- Budgets: `make bundle-check` (gzipped JS) and `make lighthouse` (LCP/CLS/TBT) — enforced in CI.
