# Known gaps — appointments-web

Things not yet complete, with the exact reason. Kept honest; updated as gaps close.

## Dev-only npm audit warnings (open)

`npm audit` reports several **moderate** advisories. All are in the dev toolchain (Vite/esbuild
and Storybook transitive dependencies), not in anything shipped to the browser:

- `npm audit --omit=dev` reports **0 vulnerabilities** (nothing in the production bundle).

They are handled by the CI `security` job (milestone 15) which fails on high/critical, plus
Dependabot. No production impact.

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
- **SSE auth.** `EventSource` cannot send an Authorization header; the cold-chain live stream will
  need a token/cookie transport, wired with the dashboard in milestone 13 (mirrors the API-side
  note from milestone 10).
- **Feature pages are placeholders.** `/appointments`, `/cold-chain`, and `/admin` render designed
  "coming in milestone 13" empty states; the routes and guards are real.

## Not yet built (by design, later milestones)

- Calendar, booking flow, appointment detail, admin views, audit log, cold-chain dashboard —
  milestone 13.
- Playwright E2E, axe-in-CI, visual regression, Lighthouse budgets — milestone 14.
- Web CI/CD (deploy, E2E against the composed stack + fleet simulator) — milestone 15.
