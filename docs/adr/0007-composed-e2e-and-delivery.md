# 0007 — Composed-stack E2E and the delivery pipeline

Status: accepted (milestone 15)

## Context

Milestone 14 built the browser test tiers, but the E2E journeys ran against the app's own MSW
backend served by `vite preview`. That is deterministic and Docker-free, but it does not prove the
app works against the _real_ API. Milestone 15 closes that: run the same journeys against the fully
composed stack (real API + Postgres + Redis behind the web tier), and add the delivery pipeline that
builds, signs, and deploys the web image.

Two things had to be decided.

### 1. How the web tier reaches the API

The SPA resolves its API base URL to `window.location.origin` unless `VITE_API_URL` is set
(`src/api/client.ts`). We serve the API on the **same origin** as the SPA: the web container is
nginx, which serves the static bundle and reverse-proxies `/api` and `/health` to the API
(`nginx/default.conf.template`, upstream from `API_UPSTREAM`). The browser sees one origin — no CORS,
no build-time API URL baked into the image, and the SSE stream works because the proxy disables
buffering. The same image runs in Compose (`API_UPSTREAM=api:8000`) and in Azure (the API app's
host).

### 2. Reusing the milestone-14 specs unchanged

The specs must not change; only what serves `/api/v1` changes. But the MSW-specific machinery in the
test **support** layer had to grow a second mode, selected by `E2E_BACKEND`:

| Concern                | Mock mode (`playwright.config.ts`)              | Composed mode (`playwright.composed.config.ts`)                                                                                                                                                                      |
| ---------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session seeding        | role-encoded mock token the MSW backend decodes | a **real login** against the API; store the issued tokens                                                                                                                                                            |
| Forced error scenarios | the app's `window.__aurora_e2e` control surface | **`page.route()`** interception (spec §6)                                                                                                                                                                            |
| Email domain           | `@aurora.test` (MSW accepts anything)           | `@aurora-clinic.com` (the API's `EmailStr` rejects the reserved `.test` TLD)                                                                                                                                         |
| Bookable day           | a fixed past Monday (MSW ignores "now")         | the **next future Monday** (the real availability filters to the future)                                                                                                                                             |
| Staff booking          | MSW lets an admin self-book                     | the API requires a `patient_id` for staff, and the wizard has no patient picker, so the manage journey **arranges the appointment through the API as the patient**, then drives the transition/cancel through the UI |

All of this lives in `e2e/support/helpers.ts`. The spec files are byte-identical to milestone 14.

The a11y and visual tiers stay on the MSW build: their fully-populated routes and pixel baselines are
seed- and engine-specific by construction, and re-proving them against a live backend adds flakiness
without adding signal. The composed run is the **journeys** — the behaviour that must hold end to end.

## Decision

- Ship a hardened web image (nginx: SPA history fallback, `/api` + `/health` reverse proxy, SSE-safe,
  CSP + security headers) and a `docker-compose.e2e.yml` that stands up the whole stack.
- `scripts/seed-e2e.mjs` provisions the exact demo graph the specs expect (the "Aurora Downtown"
  clinic, a "General practice" clinician, and the accounts) over the **public API** — the first admin
  is bootstrapped in the DB by the compose `seed-admin` service, everything else through the contract.
- Add the composed run to CI as a cross-repo `e2e-composed` job, gated behind the `API_REPO`
  variable (same shape as the API's `sil` job) so a fork with nothing configured stays green.
- Add `cd.yml`, mirroring the API's pipeline: release-please → build + cosign-sign + GHCR push
  (provenance, zero-secrets via `GITHUB_TOKEN` + OIDC) → deploy staging → smoke → manual-approval
  production → smoke, with every Azure step gated by `DEPLOY_ENABLED`. The web image is static, so
  there is no migration step — the one shape difference from the API pipeline.

## Consequences

- The journeys now prove real behaviour, and along the way documented three real API rules the MSW
  backend had papered over (reserved-TLD emails, future-only availability, staff-must-name-a-patient).
- The composed job needs Docker and the API image; it is gated, and skips cleanly without `API_REPO`.
- The "staff books on behalf" flow is not in the UI (no patient picker). The manage journey arranges
  its fixture through the API; adding a patient picker to the booking wizard is a product follow-up
  (recorded in KNOWN_GAPS).
- Verified locally against real Docker: composed journeys 11/11, mock journeys+a11y+visual 41/41,
  lint + typecheck + build + bundle budget + actionlint all green.
