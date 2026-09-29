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
  layout/                header fits on one line at 1024/1280/1440px (see "Why layout/ exists")
  showcase/              README screenshots with demo data; NOT a test, never run in CI
playwright.config.ts     builds dist-e2e (MSW) + previews it on :4173; Chromium (+ WebKit in CI)
playwright.showcase.config.ts   builds dist-demo (MSW + VITE_MSW_DEMO_DATA) on :4174 for showcase/
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
separate server is needed. `npm run screenshots` refreshes `docs/screenshots/` the same way.

### Why `layout/` exists

With an admin's six nav links the header squeezed its flex children at 1280px and wrapped "Aurora
Clinic" and "Cold chain" onto two lines. The visual baselines had been generated from that state,
so they treated the bug as correct: a screenshot test only proves the page did not _change_, not
that it was right when the baseline was taken. `layout/header.spec.ts` asserts the rule itself (one
line per label, no sideways scroll) and failed at all three widths before the fix.

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

`.github/workflows/ci.yml` runs, for these tiers: `build` (bundle budget), `e2e` (journeys + a11y +
visual on Chromium, plus a WebKit shard via `PW_ALL_BROWSERS=1`), `lighthouse`, and — added in
milestone 15 — `e2e-composed` (the journeys against the real stack, below). Reports, traces, and
videos upload as artifacts.

## Composed-stack E2E (milestone 15)

The same journeys, driven against the **real** backend instead of MSW: `docker-compose.e2e.yml`
brings up Postgres + Redis + the API + the nginx web tier (which serves the built SPA and
reverse-proxies `/api` on the same origin), `scripts/seed-e2e.mjs` provisions the demo graph over the
public API, and `playwright.composed.config.ts` runs the specs at `http://localhost:8080`.

```bash
# WSL (Ubuntu-24.04), Docker running, sibling appointments-api checked out at ../appointments-api
make e2e-composed-all      # build images -> up -> seed -> run journeys -> tear down
# or, step by step:
make compose-e2e-up        # build the API + web images and start the stack (waits for health)
make seed-e2e              # provision "Aurora Downtown" + the accounts over the API
make e2e-composed          # npm run e2e:composed
make compose-e2e-down      # stop + remove volumes
```

The **spec files are unchanged** from the MSW tier. Only `e2e/support/helpers.ts` branches on
`E2E_BACKEND`: in `composed` mode it seeds sessions with a real login (not a mock token) and forces
error scenarios with Playwright's `page.route()` (not the MSW control surface). It also uses an
ordinary email domain (the API rejects the reserved `.test` TLD), a future bookable day (the real
availability filters to the future), and — for the staff manage journey — arranges the appointment
through the API, since the wizard has no patient picker and the API requires a `patient_id` for staff
bookings. See ADR 0007. Only the journeys run here; a11y + visual stay on the deterministic MSW build.

In CI the `e2e-composed` job is **gated behind `vars.API_REPO`** (it builds the API image from that
repo). A fork with nothing configured skips it and stays green — the same shape as the API's `sil`
job.
