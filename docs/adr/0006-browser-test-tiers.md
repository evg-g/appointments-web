# ADR 0006 — Browser test tiers: E2E, accessibility, visual, and performance budgets

Status: accepted (milestone 14)

## Context

Milestones 12–13 built the web app and its Vitest unit + component + MSW suite (73 tests).
Milestone 14 adds the browser-level tiers the spec calls for: Playwright E2E of the critical
journeys, automated accessibility (axe) on every route, visual regression, and enforced performance
budgets (LCP/CLS/TBT and bundle size). Several choices shaped how these run.

## Decisions

1. **The E2E app is the real build, served with its own MSW backend.** Playwright drives the
   production Vite build served by `vite preview`, with the app's typed MSW backend supplying
   `/api/v1` (`VITE_ENABLE_MSW=true`, output to `dist-e2e`). This keeps the browser tiers
   deterministic and free of Docker/Postgres/Redis: the same seeded data and the same named error
   `scenarios` the component tests use, now exercised in a real browser. Running the identical specs
   against the fully composed stack (real API + Postgres + Redis) is milestone 15 — only what serves
   `/api/v1` changes, not the tests.

2. **Error and edge states are forced at the network layer, never with a hand-rolled mock.** The MSW
   browser worker exposes a small typed control surface (`window.__aurora_e2e`) that prepends a named
   scenario handler at runtime, plus a boot mechanism (`addInitScript`) for error states that must
   survive a full navigation (a `worker.use` override is lost on reload, and Playwright's
   `page.route` cannot intercept a request the MSW service worker answers). Both reuse the existing
   `scenarios` map, so nothing can drift from the OpenAPI contract.

3. **Sessions are seeded through a role-encoded token.** The mock's tokens encode the role, and
   `bearerUser` resolves that role to the single seed account for it even after the in-memory session
   map is lost on reload. So a test seeds `localStorage` and `goto`s any route already signed in,
   without walking the login form each time. The login form itself is still exercised by the login
   journey.

4. **Chromium is the verified engine; WebKit is the CI shard.** All tiers run on Chromium locally and
   in CI; a WebKit project is added for journeys + a11y when `PW_ALL_BROWSERS=1` (set in CI, where
   `playwright install --with-deps` provides its libraries), matching the spec's "Chromium plus one
   WebKit shard". Visual snapshots stay Chromium-only — screenshot baselines are engine-specific.

5. **Accessibility gate: zero serious/critical axe violations, every route, light + dark.** The whole
   page is scanned (WCAG 2.2 AA tag set) where landmark, heading-order, and page-contrast issues
   surface — the Storybook a11y addon only sees a component in isolation. This tier immediately caught
   a real AA contrast failure (the audit-log entity id used `text-subtle` at 4.08:1); it was fixed.

6. **Visual regression is made deterministic, and volatile pages are excluded.** The clock is frozen
   (`page.clock`), motion is reduced, and locale + timezone are pinned, so the seeded relative
   timestamps render identically every run. Baselines are Chromium-on-Linux and committed. The
   cold-chain dashboard is deliberately not snapshotted: its chart is stream/time-driven, so a pixel
   baseline would be flaky by construction — it is covered by the a11y sweep, the component tests, and
   the E2E acknowledge flow instead.

7. **Two performance budgets, enforced separately.** Bundle size is gated by a deterministic
   gzip-based script (`scripts/check-bundle-size.mjs`) on the initial (entry + preloads) and total JS.
   Runtime metrics (LCP/CLS/TBT) are gated by Lighthouse CI (`lighthouserc.json`, median of three
   runs) against the production preview, using the Chromium that Playwright already manages. Keeping
   the wire-size budget off Lighthouse avoids depending on whether its static server gzips.

8. **The budgets required real code-splitting.** The app was one ~650 kB chunk. Feature pages are now
   route-level `React.lazy` chunks behind Suspense boundaries, and `node_modules` is grouped into
   stable vendor chunks (`vite.config.ts`). Initial JS dropped to ~184 kB gzipped; Lighthouse reports
   LCP ≈ 0.6 s, CLS 0, TBT 0, performance 1.0.

## Consequences

- The browser tiers run on a laptop with no backend and no Docker, and stay deterministic.
- The error-injection surface and the seed-session shim exist only in the MSW build, never in prod
  (the module loads solely behind the `VITE_ENABLE_MSW` guard).
- Visual baselines are tied to Chromium-on-Linux; regenerate with `make e2e-update-snapshots` when a
  design change is intended, and review the diff.
- Milestone 15 swaps the E2E backend to the composed stack and adds the deploy pipeline; the specs and
  the other tiers are unaffected.
