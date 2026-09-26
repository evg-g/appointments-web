# Known gaps — appointments-web

Things not yet complete, with the exact reason. Kept honest; updated as gaps close.

## Dev-only npm audit warnings (open)

`npm audit` reports 3 **moderate** advisories. All are in the dev toolchain (Vite/esbuild
transitive dependencies), not in anything shipped to the browser:

- `npm audit --omit=dev` reports **0 vulnerabilities** (nothing in the production bundle).

They will be handled when the security gate is wired up (milestone 6/14): the CI `security`
job runs `npm audit` and fails on high/critical, and Dependabot is already configured to open
update PRs. No action needed for milestone 1.

## Not yet built (by design, later milestones)

- Design tokens, routing, generated API client, MSW mocks, feature pages — milestone 12+.
- Playwright E2E, axe, visual regression, Lighthouse budgets — milestone 14.
