# Browser testing — E2E, accessibility, visual, performance

Milestone 14 adds the browser-level tiers on top of the Vitest unit + component suite. They run
against the real production build served by `vite preview`, with the app's own typed MSW backend
supplying `/api/v1` — deterministic, and free of Docker/Postgres/Redis. The rationale is in
[ADR 0006](adr/0006-browser-test-tiers.md).

## Layout

```
e2e/
  support/helpers.ts     seed a session, walk the booking wizard, force error scenarios
  journeys/              login, book, transition/confirm, cancel, authz denial, error + empty states
  a11y/                  axe sweep: every route, light + dark, zero serious/critical
  visual/                screenshot regression: key pages, light + dark (baselines committed)
playwright.config.ts     builds dist-e2e (MSW) + previews it on :4173; Chromium (+ WebKit in CI)
lighthouserc.json        LCP / CLS / TBT budgets against the prod build
scripts/check-bundle-size.mjs   gzipped initial + total JS budget
scripts/lighthouse.mjs   runs Lighthouse with Playwright's Chromium
```

## Commands

```bash
make setup-e2e              # install the Playwright Chromium browser
make e2e                    # journeys + a11y + visual (Chromium)
make e2e-a11y               # accessibility sweep only
make e2e-visual             # visual regression only
make e2e-update-snapshots   # regenerate visual baselines (review the diff, then commit)
make bundle-check           # build + enforce the gzipped bundle-size budget
make lighthouse             # build + LCP/CLS/TBT budgets
```

`npm run e2e` builds the MSW app and previews it automatically (the Playwright `webServer`), so no
separate server is needed.

## Budgets

| Budget                                 | Gate                            | Value                         |
| -------------------------------------- | ------------------------------- | ----------------------------- |
| Initial JS (entry + preloads), gzipped | `scripts/check-bundle-size.mjs` | ≤ 235 kB (currently ≈ 184 kB) |
| Total JS, gzipped                      | same                            | ≤ 265 kB (currently ≈ 210 kB) |
| Largest Contentful Paint               | Lighthouse                      | ≤ 2500 ms (currently ≈ 0.6 s) |
| Cumulative Layout Shift                | Lighthouse                      | ≤ 0.1 (currently 0)           |
| Total Blocking Time                    | Lighthouse                      | ≤ 500 ms (currently 0)        |

## Corporate network (WSL) caveats

- **Browser download** goes to `cdn.playwright.dev`, which the TLS proxy intercepts. Export
  `NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt` (the corporate roots are already in the
  system store) before `npx playwright install`, or the download fails with
  `UNABLE_TO_VERIFY_LEAF_SIGNATURE`.
- **Chromium launch** needs three system libraries not present on a bare Ubuntu-24.04:
  `libnss3 libnspr4 libasound2t64`. In CI, `playwright install --with-deps` handles this. Locally,
  either `sudo apt-get install -y libnss3 libnspr4 libasound2t64`, or (no sudo) `apt-get download`
  those packages, `dpkg -x` them into a directory, and add its `usr/lib/x86_64-linux-gnu` to
  `LD_LIBRARY_PATH`.

## CI

`.github/workflows/ci.yml` runs three jobs for these tiers: `build` (bundle budget), `e2e`
(journeys + a11y + visual on Chromium, plus a WebKit shard via `PW_ALL_BROWSERS=1`), and
`lighthouse`. Reports, traces, and videos upload as artifacts. Running the journeys against the fully
composed stack (real API) is milestone 15.
