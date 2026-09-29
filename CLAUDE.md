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
- E2E / a11y / visual: Playwright under `e2e/`. `make e2e` runs journeys + a11y + visual against the
  real build served by `vite preview` with the app's MSW backend (`VITE_ENABLE_MSW=true`) —
  deterministic, no Docker. Force error states through the MSW `scenarios` map, never a hand-rolled
  mock. `make e2e-update-snapshots` regenerates visual baselines (Chromium-on-Linux, committed).
- Composed-stack E2E (milestone 15): the same **journeys** run against the real API + Postgres +
  Redis behind the web tier. `make e2e-composed-all` (build images → up → seed → run → down), or the
  `e2e-composed` CI job (gated on `vars.API_REPO`). The specs are unchanged; `e2e/support/helpers.ts`
  branches on `E2E_BACKEND=composed` (real login + `page.route()` injection). See
  `docs/BROWSER_TESTING.md`, `docs/CI_CD.md`, ADR 0006 + 0007.
- Budgets: `make bundle-check` (gzipped JS) and `make lighthouse` (LCP/CLS/TBT) — enforced in CI.
- Delivery: `Dockerfile` (nginx: SPA + same-origin `/api` proxy) → `cd.yml` (release-please → cosign
  sign → GHCR → Azure Container Apps, all cloud steps gated by `DEPLOY_ENABLED`). See
  `docs/DEPLOYMENT.md`.
