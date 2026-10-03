# Multi-stage build: compile the static bundle with Node, then serve it with nginx, which also
# reverse-proxies the API on the same origin (see nginx/default.conf.template). The final image
# ships only the built assets + nginx — no Node, no node_modules, no source.

FROM node:20-slim AS builder

# Optional corporate-CA support (off by default; see docs/CORPORATE_NETWORK equivalent in the API
# repo). Only needed for local builds behind a TLS-inspecting proxy; CI runners have a clean path.
ARG EXTRA_CA_CERT=""
RUN if [ -n "$EXTRA_CA_CERT" ]; then \
        echo "$EXTRA_CA_CERT" > /usr/local/share/ca-certificates/extra.crt && \
        update-ca-certificates; \
    fi
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Production build: MSW is NOT enabled (no VITE_ENABLE_MSW) and no VITE_API_URL is baked in, so the
# app resolves the API at window.location.origin and the nginx proxy below serves it same-origin.
RUN npm run build


FROM nginx:1.30-alpine AS runtime

ARG VERSION="0.0.0"
ARG REVISION="unknown"
LABEL org.opencontainers.image.title="appointments-web" \
      org.opencontainers.image.description="Aurora Clinic web app: SPA + same-origin API reverse proxy" \
      org.opencontainers.image.source="https://github.com/evg-g/appointments-web" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}"

# Pull in Alpine security fixes that landed after the base image was built (the Trivy gate fails
# on fixed HIGH/CRITICAL CVEs, and the nginx image can lag the Alpine repo by days).
RUN apk upgrade --no-cache

# Host:port the SPA's /api and /health requests are proxied to. Override at runtime (compose sets
# `api:8000`; the Azure web container app sets the API app's FQDN).
ENV API_UPSTREAM="api:8000"

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/aurora-security-headers.conf /etc/nginx/aurora-security-headers.conf
COPY --from=builder /app/dist /usr/share/nginx/html

# Non-privileged port so the container needs no extra capabilities.
EXPOSE 8080
# 127.0.0.1, not localhost: nginx listens on IPv4 only, and BusyBox wget tries ::1 first wherever
# the container has an IPv6 loopback, failing with "connection refused" without falling back.
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:8080/ || exit 1

# The base image's entrypoint runs envsubst over the template, then execs `nginx -g 'daemon off;'`.
