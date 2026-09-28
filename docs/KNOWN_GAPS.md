# Known gaps — appointments-web

Things not yet complete, with the exact reason. Kept honest; updated as gaps close.

## Dev-only npm audit warnings (open)

`npm audit` reports several **moderate** advisories. All are in the dev toolchain (Vite/esbuild
and Storybook transitive dependencies), not in anything shipped to the browser:

- `npm audit --omit=dev` reports **0 vulnerabilities** (nothing in the production bundle).

They are handled by the CI `security` job (milestone 15) which fails on high/critical, plus
Dependabot. No production impact.

## Milestone 13 (web features) — deliberate deferrals

- **Audit log reads an empty table in production.** The web audit-log page is fully wired to the
  new admin-only `GET /api/v1/audit-log` endpoint (contract-driven, keyset-paginated, filterable).
  But the backend `audit_log` table currently has **no write call sites** — nothing records entries
  yet — so against the real API the page shows an empty state until domain write-instrumentation
  lands (a backend follow-up, tracked in `appointments-api/docs/KNOWN_GAPS.md`). The MSW mock seeds
  entries so the UI is demonstrable and tested.
- **SSE over `fetch`, not `EventSource`.** The live cold-chain stream is read with `fetch` +
  a `ReadableStream` reader so the bearer token can be attached and `Last-Event-ID` resumed — this
  closes the milestone-12 EventSource-auth gap. The SSE body shape is not part of the OpenAPI
  contract (SSE frames aren't modelled), so `toTelemetryPoint` reads known fields defensively.
- **Temperature chart is a hand-rolled inline SVG.** No chart library is pulled in (keeps the bundle
  lean and avoids an external dependency, consistent with the "no external image services" rule).
  It covers a single series + safe band; richer interactions are not a milestone-13 requirement.
- **Threshold editor is create-only.** The contract exposes `POST /threshold-policies` but no
  list/get, so the editor creates (replaces) a device-scoped policy and previews the band; it cannot
  pre-load the current policy. A read endpoint is the follow-up.
- **Bundle still not code-split.** The app is one chunk (~650 kB) and trips Vite's 500 kB warning.
  Route-level `lazy()` splitting and enforced bundle/Lighthouse budgets are milestone 14.
- **MSW-in-Storybook still deferred.** Feature-page stories that drive real data through MSW are not
  added; the milestone-13 stories are the presentational composites (chart, table, select, textarea)
  plus the milestone-12 primitives. Data-driven page stories move with the E2E/visual work.
- **Profile is read-only.** The settings page shows the user from `/auth/me`; there is no
  update-user endpoint in the contract, so editing is a follow-up.

## Milestone 12 (web foundation) — deliberate deferrals

- **Token storage.** Tokens live in memory and are mirrored to `localStorage` so a reload keeps
  the session. This is an XSS-exposure tradeoff for a SPA with no backend-for-frontend; see
  ADR 0003. A cookie/BFF hardening is the documented follow-up.
- **No proactive refresh.** Refresh is reactive (on a 401). `expiresAt` is stored but not yet used
  to refresh ahead of expiry. Reactive refresh is simpler and sufficient for the foundation.
- **Bundle not code-split.** The initial JS chunk is one bundle. Route-level `lazy()` splitting and
  the enforced bundle/Lighthouse budgets land with the performance work in milestone 14.
- **MSW not yet wired into Storybook.** The handlers are shared by Vitest and the dev server today;
  the foundation stories are data-free (they drive `QueryBoundary` with fake query objects), so the
  Storybook↔MSW binding is added when data-driven feature stories arrive (milestone 13).
- **SSE auth** — closed in milestone 13 (see the SSE-over-`fetch` note above).
- **Feature pages** — built in milestone 13. `/appointments`, `/appointments/new`,
  `/appointments/:id`, `/calendar`, `/cold-chain`, `/admin/*`, and `/settings` are all real.

## Not yet built (by design, later milestones)

- Playwright E2E, axe-in-CI, visual regression, Lighthouse budgets — milestone 14.
- Web CI/CD (deploy, E2E against the composed stack + fleet simulator) — milestone 15.
