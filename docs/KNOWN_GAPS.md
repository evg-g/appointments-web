# Known gaps — appointments-web

Things not yet complete, with the exact reason. Kept honest; updated as gaps close.

## Milestone 15 (web CI/CD complete) — deliberate scope + deferrals

- **Composed-stack E2E — closed.** The milestone-14 journeys now also run against the fully composed
  stack (real API + Postgres + Redis behind the nginx web tier), via `docker-compose.e2e.yml` +
  `playwright.composed.config.ts`. The spec files are unchanged; only `e2e/support/helpers.ts`
  branches on `E2E_BACKEND` (real login + `page.route()` error injection). CI: the `e2e-composed`
  job, gated behind `vars.API_REPO`. Verified locally: 11/11. See ADR 0007 + `docs/CI_CD.md`.
- **a11y + visual tiers stay on the MSW build.** Only the journeys run against the composed stack.
  The a11y sweep needs every route fully populated and the visual baselines are pixel- and
  engine-specific — re-proving them against a live backend adds flakiness without adding signal, so
  they remain on the deterministic MSW build (the `e2e` job).
- **Staff cannot book through the wizard.** The real API requires a `patient_id` when staff book on
  behalf of a patient, but the booking wizard has no patient picker (it books for the signed-in
  patient). The manage journey therefore arranges its appointment through the API as the patient,
  then drives the transition/cancel through the UI. Adding a patient picker to the wizard is a
  product follow-up; MSW papered over this by defaulting the patient to the actor.
- **Fleet/device simulator is not wired into the web E2E compose.** No journey asserts on live
  telemetry ingestion (the cold-chain route is authz-only in the journeys and is excluded from a11y +
  visual), and live ingestion is already proven by the device SIL tier (aurora-sensor-agent,
  milestone 11) and the API telemetry tests (milestone 10). Adding the device image + MQTT broker to
  the web compose would be cross-repo and flaky for no added web-side signal, so it is deliberately
  out of scope here.
- **Security + CodeQL jobs are wired but were not executed locally.** `ci.yml` gains `security`
  (npm audit on production deps, gitleaks, Trivy image scan on HIGH/CRITICAL, CycloneDX SBOM) and
  `codeql`. These run on GitHub-hosted runners; they were validated with `actionlint` but not run in
  this environment. The dependency gate is `npm audit --omit=dev` (production tree, 0 today).
- **TLS to the API upstream.** The nginx proxy targets plain HTTP (correct for Compose and a shared
  Container Apps environment). An HTTPS-only public API upstream needs a one-line `proxy_pass https`
  - `proxy_ssl_server_name` change to the template — noted in `docs/DEPLOYMENT.md`, off the default
    path.

## Milestone 14 (browser tests + budgets) — deliberate scope + deferrals

- **E2E against MSW — composed-stack run added in milestone 15 (see above).** The Playwright journeys
  drive the real production build served by `vite preview`, with MSW supplying `/api/v1` (seeded
  data + the same named error scenarios the component tests use). This keeps the tier deterministic
  and Docker-free; the same specs also run against the real stack now. See ADR 0006 + 0007.
- **WebKit is a CI-only shard.** Journeys + a11y run on Chromium locally and on Chromium + WebKit in
  CI (`PW_ALL_BROWSERS=1`, where `playwright install --with-deps` provides WebKit's libraries).
  Visual snapshots are Chromium-only by design (baselines are engine-specific).
- **Cold-chain dashboard is not visually snapshotted.** Its chart is stream/time-driven, so a pixel
  baseline would be flaky by construction (the "zero flakiness" rule). It is covered by the a11y
  sweep, the component tests, and the E2E acknowledge flow instead.
- **Bundle now code-split (closed).** The app was one ~650 kB chunk; feature pages are now
  route-level `React.lazy` chunks and `node_modules` is grouped into vendor chunks. Initial JS is
  ≈ 184 kB gzipped, enforced by `scripts/check-bundle-size.mjs`; Lighthouse budgets (LCP/CLS/TBT)
  are enforced by `lighthouserc.json`. See `docs/BROWSER_TESTING.md`.

## Dev-only npm audit warnings (open)

`npm audit` reports several **moderate** advisories. All are in the dev toolchain (Vite/esbuild
and Storybook transitive dependencies), not in anything shipped to the browser:

- `npm audit --omit=dev` reports **0 vulnerabilities** (nothing in the production bundle).

They are handled by the CI `security` job (added in milestone 15), which gates the **production**
dependency tree (`npm audit --omit=dev --audit-level=high`) and scans the built image with Trivy,
plus Dependabot. The dev-only advisories are surfaced but not shipped. No production impact.

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
- **Bundle code-splitting — closed in milestone 14.** Route-level `lazy()` splitting + vendor
  chunking landed with the performance budgets (see the milestone-14 section above).
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
- **Bundle not code-split** — closed in milestone 14 (route-level `lazy()` + vendor chunking +
  enforced bundle/Lighthouse budgets).
- **MSW not yet wired into Storybook.** The handlers are shared by Vitest and the dev server today;
  the foundation stories are data-free (they drive `QueryBoundary` with fake query objects), so the
  Storybook↔MSW binding is added when data-driven feature stories arrive (milestone 13).
- **SSE auth** — closed in milestone 13 (see the SSE-over-`fetch` note above).
- **Feature pages** — built in milestone 13. `/appointments`, `/appointments/new`,
  `/appointments/:id`, `/calendar`, `/cold-chain`, `/admin/*`, and `/settings` are all real.

## Not yet built (by design, later milestones)

- Playwright E2E, axe-in-CI, visual regression, Lighthouse budgets — built in milestone 14
  (see the milestone-14 section above and `docs/BROWSER_TESTING.md`).
- Web CI/CD (deploy pipeline + E2E against the composed stack) — built in milestone 15
  (see the milestone-15 section above, `docs/CI_CD.md`, `docs/DEPLOYMENT.md`, ADR 0007).
- Documentation, exercises, diagrams, final polish — milestone 16.
