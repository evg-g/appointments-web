# ADR 0005 — Feature architecture, optimistic writes, and live data

Status: accepted (milestone 13)

## Context

Milestone 13 builds the product surface on the milestone-12 foundation: calendar, booking,
appointment detail + transitions, admin (clinics/clinicians/services/audit), settings, and the
cold-chain dashboard with live charts. Several cross-cutting decisions were needed.

## Decisions

1. **Feature-slice structure.** Feature UI lives under `src/features/<domain>/`; thin route files in
   `src/routes/` compose them, keeping the router declarative. Data access is a per-domain hook layer
   under `src/api/hooks/` over the generated `openapi-fetch` client, with a single query-key factory
   (`src/api/query-keys.ts`) so invalidation targets exactly the right cache entries.

2. **Cursor pagination via `useInfiniteQuery`.** Every list (appointments, catalog, devices,
   excursions, audit) uses the contract's `{ data, page: { has_more, next_cursor } }` shape with a
   "load more" affordance. The mock backend paginates too, so the mechanism is exercised in tests.

3. **Optimistic booking with rollback + idempotency.** `POST /appointments` is issued with a
   client-generated `Idempotency-Key` (stable per chosen slot, so a retried submit cannot
   double-book). The mutation optimistically inserts the appointment into every cached list and rolls
   back on error (409/422/network). This is the spec's headline write path.

4. **ETag/If-Match for state changes.** The detail query captures the server's strong `ETag`; the
   transition and cancel mutations send it as `If-Match`, so a stale view gets a clean 412 surfaced
   as a problem+json message rather than clobbering a concurrent change.

5. **SSE over `fetch`, not `EventSource`.** The browser's `EventSource` cannot attach an
   `Authorization` header, and the telemetry stream is bearer-authenticated. We read the
   `text/event-stream` ourselves over `fetch` + a `ReadableStream` reader (`src/api/sse.ts`): this
   attaches the token, resumes with `Last-Event-ID`, and backs off on drop. The frame parser is a
   pure, unit-tested function. This closes the milestone-12 EventSource-auth gap.

6. **Dependency-free temperature chart.** The chart is an inline SVG driven by design tokens (CSS
   custom properties), so it themes automatically and adds no chart library to the bundle. It merges
   the historical time-series (REST) with live SSE points and shades the safe band.

7. **Audit log is contract-driven.** Rather than hand-write a type for a table with no API, we added
   a read-only, admin-only `GET /api/v1/audit-log` to the backend, regenerated + vendored the
   contract, and built the page on the generated client. The backend table has no write call sites
   yet (documented gap), so the page is empty against the real API and seeded in the mock.

## Consequences

- Every list and every write path is typed end-to-end from the OpenAPI contract; a backend change
  breaks the build, not production.
- The SSE reader is more code than `EventSource` but is the only browser-correct way to keep bearer
  auth; it is isolated behind `useTelemetryStream`.
- The chart trades rich interactivity for zero dependencies and perfect theming; revisit if richer
  analytics are needed.
