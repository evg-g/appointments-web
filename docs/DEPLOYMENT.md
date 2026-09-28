# Deployment — appointments-web

Why this file exists: what the web image is, how it finds the API, and where it runs. The pipeline
that builds and ships it is in `docs/CI_CD.md`.

## The image

`Dockerfile` is multi-stage: a Node stage builds the static bundle (`npm run build` — no MSW, no
`VITE_API_URL` baked in), and an nginx stage serves it. nginx does two jobs
(`nginx/default.conf.template`):

1. **Serve the SPA** with a history-API fallback, so client-side routes (`/appointments`,
   `/cold-chain`, …) return `index.html` instead of 404. Hashed assets are cached immutably; the
   shell is never cached.
2. **Reverse-proxy the API on the same origin**: `/api` and `/health` go to `API_UPSTREAM`. Same
   origin means the browser needs no CORS and the SPA needs no build-time API URL — it resolves the
   API at `window.location.origin` (`src/api/client.ts`). The `/api` location disables proxy
   buffering so the telemetry **SSE** stream flows in real time.

Security headers + a strict CSP are applied to the shell (`nginx/aurora-security-headers.conf`):
`default-src 'self'`, `connect-src 'self'` (API + SSE are same-origin), `frame-ancestors 'none'`,
`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`.

`API_UPSTREAM` is the one knob, injected at container start (the nginx image runs envsubst over the
template). Default `api:8000` (the compose service name).

## Where it runs

### Azure Container Apps (primary)

`infra/main.bicep` (+ `staging.bicepparam` / `production.bicepparam`) declares a Log Analytics
workspace, a Container Apps managed environment, and the web container app (external ingress on 8080,
autoscaling, a `/` health probe). `API_UPSTREAM` points at the API app in the same environment.

`cd.yml` deploys by rolling the image with `az containerapp update` after authenticating with OIDC —
no stored client secret. Every Azure step is gated by `DEPLOY_ENABLED`, so the pipeline is green on a
fork with zero secrets. The first-push / environment / branch-protection setup is shared with the API
repo (`appointments-api/docs/FIRST_PUSH.md`, `docs/BRANCH_PROTECTION.md`).

### Docker Compose (no-cloud fallback)

`docker-compose.prod.yml` runs the published, immutable web image anywhere there is a Docker host:

```bash
# any Docker host
export WEB_IMAGE=ghcr.io/evg-g/appointments-web:1.2.3
export API_UPSTREAM=appointments-api:8000   # the API service on the same network
docker compose -f docker-compose.prod.yml up -d
```

Put the web container and the API's `docker-compose.prod.yml` on one network and point
`API_UPSTREAM` at the API service name:port. For a full local stack (API + Postgres + Redis + web)
used by the E2E run, see `docker-compose.e2e.yml` and `docs/CI_CD.md`.

## TLS to the API

In Compose and in a shared Container Apps environment the proxy target is plain HTTP on an internal
address, which is what the nginx template does today. If the API is only reachable over HTTPS on a
public host, the proxy needs `proxy_pass https://…` + `proxy_ssl_server_name on` — a one-line change
to the template, noted here as the hardening step rather than carried on the default path.
