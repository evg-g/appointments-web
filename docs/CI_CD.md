# CI/CD — appointments-web

Why this file exists: a plain walkthrough of every workflow gate, what it proves, and what real
failure it prevents. The companion is `docs/BROWSER_TESTING.md` (the test tiers) and
`docs/DEPLOYMENT.md` (where the image runs).

There are two workflows: `ci.yml` (on every PR) and `cd.yml` (on push to `main`).

## `ci.yml` — pull-request gates

All jobs run on `ubuntu-latest` with Node 20 and `npm ci`. They run in parallel; each is a required
check.

| Job            | Command                            | What it catches                                                                |
| -------------- | ---------------------------------- | ------------------------------------------------------------------------------ |
| `lint`         | `npm run lint` + `format:check`    | style + `no-any`/`no-floating-promises`; prettier drift                        |
| `typecheck`    | `tsc --noEmit`                     | type errors, including a contract change the app depends on                    |
| `test-unit`    | `vitest run --coverage`            | unit + component behaviour (MSW), the four states                              |
| `contract`     | `check:client`                     | the generated client is stale vs the committed `openapi.json` (spec §8.3)      |
| `build`        | `build` + `bundle:check`           | build breaks; the gzipped initial/total JS budget is exceeded                  |
| `e2e`          | `npm run e2e`                      | journeys + a11y + visual against the **MSW** build (Chromium + a WebKit shard) |
| `lighthouse`   | `npm run lighthouse`               | LCP / CLS / TBT budgets regress                                                |
| `storybook`    | `build:storybook`                  | the component workshop no longer builds                                        |
| `e2e-composed` | compose up → seed → `e2e:composed` | the journeys against the **real** stack (see below)                            |

### The `e2e-composed` job (milestone 15)

This is the one job that needs Docker and a second repo. It:

1. checks out this repo **and** the API repo (`vars.API_REPO`, e.g. `evg-g/appointments-api`),
2. `docker build`s the API image as `appointments-api:local`,
3. brings up `docker-compose.e2e.yml` (Postgres + Redis + migrate + API + the web tier), waits for
   health,
4. runs `scripts/seed-e2e.mjs` to provision the demo graph over the API,
5. runs `npm run e2e:composed` — the journeys against `http://localhost:8080`, no MSW,
6. uploads the Playwright report and tears the stack down.

It is **gated behind `API_REPO`**: set that repository variable to enable it. A fork with nothing
configured skips it cleanly and the workflow stays green — the same cross-repo gating the API's `sil`
job uses. Locally: `make e2e-composed-all` (or `make compose-e2e-up && make seed-e2e && make
e2e-composed`).

Why keep both `e2e` (MSW) and `e2e-composed`? The MSW run is fast, deterministic, and covers a11y +
visual, which are seed- and engine-specific. The composed run proves the journeys hold against real
business rules (auth, availability, ETag/If-Match transitions, problem+json). See ADR 0007.

## `cd.yml` — delivery, on push to `main`

Flow: **release → build + sign + push → deploy staging → smoke → manual approval → deploy production
→ smoke.** It mirrors the API's `cd.yml`; the only shape difference is that the web image is static,
so there is no database-migration step.

- **release** — `release-please` (release-type `node`) maintains a release PR from the
  conventional-commit history. Only when that PR merges and a semver tag is cut does the rest run.
- **build + sign + push** — build the image, push to GHCR (semver + SHA + `latest`), **cosign**
  keyless signature (OIDC, no key), and a provenance attestation. Works with no configured
  secrets — it uses the built-in `GITHUB_TOKEN` and GitHub OIDC.
- **deploy staging** — Azure login via **OIDC** (no client secret), roll the container app image,
  then `scripts/smoke_test.mjs` hits the deployed URL (SPA shell + a proxied `/health/ready`). On
  smoke failure it reactivates the previous good revision.
- **deploy production** — the `production` GitHub Environment carries a required-reviewers rule, so
  this job pauses for manual approval. Same deploy + smoke + rollback.

**Zero-secrets behaviour:** every step that talks to Azure is guarded by `vars.DEPLOY_ENABLED ==
'true'`. On a fork with nothing configured, release + build + sign + push still run (they need no
secrets), and the deploy jobs skip cleanly, so the whole pipeline stays green.

Infrastructure-as-code for the container app is in `infra/main.bicep` (+ `staging`/`production`
bicepparam); the no-cloud fallback is `docker-compose.prod.yml`. See `docs/DEPLOYMENT.md`.
