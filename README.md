# appointments-web

The web front end for **Aurora Clinic** — appointment scheduling and cold-chain monitoring.
React 19, TypeScript (strict), Vite, Tailwind v4.

One of three repos in the system — see the top-level `README.md`.

## Why this exists

A genuinely professional UI on top of the API: role-aware scheduling, a booking flow, admin
views, and a live cold-chain dashboard. It is where design-token discipline, accessibility,
and the four async states (loading / empty / error / success) are practised, and where the
API client is generated from the backend's OpenAPI schema rather than hand-written.

## Status

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

## Quick start

```bash
# WSL (Ubuntu-24.04)
make setup             # npm ci (or npm install on first run)
make dev               # start Vite on http://localhost:5173
make test              # run Vitest
make storybook         # component workshop on http://localhost:6006
make ci-local          # lint + typecheck + test + client drift check
```

Seed logins for the mock/dev server (`VITE_ENABLE_MSW=true npm run dev`), all with password
`password123`: `patient@aurora.test`, `clinician@aurora.test`, `admin@aurora.test`.

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

## License

MIT — see `LICENSE`.
