# appointments-web

[![ci](https://github.com/evg-g/appointments-web/actions/workflows/ci.yml/badge.svg)](https://github.com/evg-g/appointments-web/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Part of **[Aurora Clinic](https://github.com/evg-g/aurora)** — three repos, one product.

**[Live demo](https://evg-g.github.io/appointments-web/)** · **[Latest Playwright report](https://evg-g.github.io/appointments-web/report/)**

![The cold-chain dashboard: live fridge temperature with an excursion above the safe band](docs/screenshots/cold-chain.png)

<sub>A real rendered page from the production build with its mock backend, captured by Playwright (`npm run screenshots`).</sub>

The web front end for **Aurora Clinic** — appointment scheduling and cold-chain monitoring.
React 19, TypeScript (strict), Vite, Tailwind v4.

One of three repos in the system — see the [top-level `README.md`](https://github.com/evg-g/aurora).

## Why this exists

A genuinely professional UI on top of the API: role-aware scheduling, a booking flow, admin
views, and a live cold-chain dashboard. It is where design-token discipline, accessibility,
and the four async states (loading / empty / error / success) are applied, and where the
API client is generated from the backend's OpenAPI schema rather than hand-written.

## Quick start

```bash
# WSL (Ubuntu-24.04)
make setup             # npm ci (or npm install on first run)
make dev               # start Vite on http://localhost:5173
make test              # run Vitest
make storybook         # component workshop on http://localhost:6006
make ci-local          # lint + typecheck + test + client drift check

# Browser tiers — need the Playwright Chromium browser:
make setup-e2e         # install Chromium
make e2e               # E2E journeys + a11y + visual (builds the MSW app and previews it)
make bundle-check      # enforce the gzipped bundle-size budget
make lighthouse        # LCP/CLS/TBT budgets against the prod build

# Composed-stack E2E (milestone 15) — needs Docker + the sibling appointments-api repo:
make e2e-composed-all  # build images → compose up → seed → run journeys → tear down
```

Seed logins for the mock/dev server (`VITE_ENABLE_MSW=true npm run dev`), all with password
`password123`: `patient@aurora.test`, `clinician@aurora.test`, `admin@aurora.test`. The composed
stack uses the same local parts on an ordinary domain (`@aurora-clinic.com`), since the real API
rejects the reserved `.test` TLD.

## Build history

What each milestone delivered, newest first.

<details>
<summary>Milestones 12–15</summary>

Milestone 15 (web CI/CD complete) complete:

- **Composed-stack E2E** — the milestone-14 journeys now also run against the fully composed stack
  (real API + Postgres + Redis behind the nginx web tier), not just MSW. `docker-compose.e2e.yml`
  stands the stack up, `scripts/seed-e2e.mjs` provisions the demo graph over the real API, and
  `playwright.composed.config.ts` runs the **unchanged** specs at `http://localhost:8080`. Only
  `e2e/support/helpers.ts` branches on `E2E_BACKEND` (real login + `page.route()` error injection).
  Verified locally: 11/11. CI: the `e2e-composed` job, gated behind `vars.API_REPO`.
- **Web tier** — a hardened `Dockerfile` (nginx serving the SPA with a history-API fallback and
  reverse-proxying `/api` + `/health` on the same origin; SSE-safe; CSP + security headers).
- **Delivery pipeline** (`cd.yml`) — release-please → build + **cosign** keyless signature + GHCR
  push (provenance) → deploy staging → smoke → manual-approval production → smoke, on Azure Container
  Apps via OIDC. Every cloud step is gated by `DEPLOY_ENABLED`, so a fork stays green with no secrets.
  `docker-compose.prod.yml` is the no-cloud fallback; `infra/` holds the Bicep.
- **CI hardening** — `security` (npm audit on production deps, gitleaks, Trivy image scan, SBOM),
  `codeql`, `commitlint`, and `workflow-lint` jobs added.

See [ADR 0007](docs/adr/0007-composed-e2e-and-delivery.md), [docs/CI_CD.md](docs/CI_CD.md), and
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Milestone 14 (browser test tiers + performance budgets) complete:

- **Playwright E2E** (`e2e/journeys/`) — login, book, transition/confirm, cancel, authorization
  denial, and forced error + empty states. The specs drive the real production build served by
  `vite preview`, with the app's own typed MSW backend supplying `/api/v1` (deterministic, no
  Docker). The same journeys also run against the composed real stack (milestone 15, above).
- **Accessibility** (`e2e/a11y/`) — `@axe-core/playwright` sweeps every route in light and dark;
  zero serious/critical violations, enforced. (It caught and we fixed a real WCAG AA contrast bug.)
- **Visual regression** (`e2e/visual/`) — Playwright screenshots of the key pages, light + dark,
  made deterministic with a frozen clock and pinned locale/timezone.
- **Performance budgets** — the app was code-split (route-level `React.lazy` + vendor chunks), taking
  initial JS to ≈ 184 kB gzipped. A bundle-size gate (`scripts/check-bundle-size.mjs`) and Lighthouse
  budgets (LCP/CLS/TBT — currently LCP ≈ 0.6 s, CLS 0, TBT 0, performance 1.0) are enforced in CI.

See [ADR 0006](docs/adr/0006-browser-test-tiers.md) and [docs/BROWSER_TESTING.md](docs/BROWSER_TESTING.md).

Milestone 13 (web features) complete — the full product surface on the foundation:

- **Calendar / week view** (`src/features/calendar/`) — a clinician's open slots across a week,
  collapsing to an agenda stack on small screens; each day column fetches its own availability.
- **Booking flow** (`src/features/appointments/BookingFlow.tsx`) — clinic → service → clinician →
  day/slot → confirm, with an `Idempotency-Key`, an optimistic insert, and rollback on conflict.
- **Appointment detail** — status transitions and cancellation guarded by ETag/`If-Match` (stale
  changes get a clean 412), with `problem+json` mapped to the UI.
- **Admin** (`src/features/admin/`) — clinics, per-clinic services and clinicians (create forms with
  Zod + field-level `problem+json` mapping), and an **audit log** with server-side pagination and
  filters, built on the new admin-only `GET /api/v1/audit-log` endpoint.
- **Cold-chain dashboard** (`src/features/cold-chain/`) — a live SSE temperature chart (bearer-auth
  `fetch` reader with `Last-Event-ID`), device health tiles, an excursion timeline with an
  acknowledge flow, and a threshold editor. The chart is a dependency-free, token-themed inline SVG.
- **Settings** — profile, theme, and sign-out.

See ADR 0005 for the feature architecture, optimistic-write, SSE, and audit-log decisions, and
`docs/KNOWN_GAPS.md` for deliberate deferrals (bundle budgets, MSW-in-Storybook, audit write
instrumentation). Playwright E2E, axe-in-CI, visual regression, and Lighthouse budgets are
milestone 14.

Milestone 12 (web foundation) complete:

- **Design tokens first** (`src/styles/tokens.css`) — a restrained palette with a single teal
  accent, an 8px spacing rhythm, a type scale, radii, elevation, and motion. Light and dark
  themes flip at the CSS-custom-property level; components consume tokens, never raw hex.
  Tailwind v4 maps the tokens onto utilities via an `@theme` layer.
- **Theme system** (`src/theme/`) — follows the OS by default, honours a user override, no FOUC.
- **Generated API client** (`src/api/`) — `openapi-typescript` turns the vendored
  `contracts/openapi.json` into types; `openapi-fetch` provides the typed client with transparent
  bearer-token attachment and a single-flight refresh-on-401 retry. A CI drift check fails if the
  committed client is stale.
- **Auth flow** (`src/auth/`) — login (React Hook Form + Zod, `problem+json`/422 mapped to fields),
  session hydration via `/auth/me`, protected routes, and role-aware route/UI guards.
- **Four-state primitives** (`src/components/ui/`) — Button, Input/Field, Card, Alert, Badge,
  Spinner, Skeleton, EmptyState, ErrorState, and a `QueryBoundary` that renders exactly one of
  loading / empty / error / success from a query. All token-driven and accessible.
- **Layout shell** (`src/components/layout/`) — sticky header, role-aware navigation, theme toggle,
  account menu (Radix), skip link; responsive from 360px.
- **MSW mocks** (`src/mocks/`) — handlers typed against the generated OpenAPI types, shared by
  Vitest and the dev server. Storybook for every primitive, with the a11y (axe) addon.

</details>

## The generated API client

The client is generated, never hand-written (ADR 0001):

```bash
make vendor-contract   # copy appointments-api/contracts/openapi.json here, then regenerate
make check-client      # CI drift gate: regenerate and fail if the committed client changed
```

Point the app at a running backend with `VITE_API_URL=http://localhost:8000`; otherwise it uses
the current origin (the composed stack serves the API under `/api/v1`).

## Layout

```
src/
  api/         generated schema + typed client, per-domain hooks/, query-key factory, SSE reader
  app/         providers, query client, route tree
  auth/        token store, auth context/provider, route + role guards, login schema
  components/  ui/ (primitives + stories) and layout/ (app shell, nav)
  features/    appointments, calendar, admin, settings, cold-chain (feature UI)
  lib/         formatters (datetime, units, cn)
  mocks/       MSW handlers (typed) + a stateful in-memory backend (db.ts)
  routes/      login + thin route files composing the feature pages
  styles/      design tokens + global stylesheet
  theme/       theme provider + hook
  test/        Vitest setup and render helpers
```

## Docs

| Doc                                                   | What it covers                                                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [`docs/BROWSER_TESTING.md`](docs/BROWSER_TESTING.md)  | The browser tiers: E2E journeys, accessibility, visual regression, layout rules, and the performance budgets. |
| [`docs/EXERCISES.md`](docs/EXERCISES.md)              | Break-it-on-purpose exercises: make the change, predict which gate fails, run it, confirm.                    |
| [`docs/CI_CD.md`](docs/CI_CD.md)                      | The pipeline, the Pages demo, and the release and deploy path.                                                |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)            | The nginx image and the Azure Container Apps deployment.                                                      |
| [`docs/KNOWN_GAPS.md`](docs/KNOWN_GAPS.md)            | What is deliberately not done yet, and why.                                                                   |
| [`docs/adr/`](docs/adr/)                              | The design decisions, one file each.                                                                          |
| [`DESIGN.md`](DESIGN.md) · [`PRODUCT.md`](PRODUCT.md) | The design tokens and the product surface.                                                                    |

## License

MIT — see `LICENSE`.
