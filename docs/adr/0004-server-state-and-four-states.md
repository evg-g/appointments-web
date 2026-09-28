# 4. Server state with TanStack Query and a four-state contract

- Status: accepted
- Date: 2026-09-28

## Context

Most of this app's state is server state: appointments, devices, telemetry. Managing it with
component `useState` + `useEffect` leads to duplicated caches, race conditions, and forgotten
loading/error handling. The spec also mandates that **every async surface** has four designed
states — loading (skeleton, not a bare spinner), empty (with a next action), error (with retry),
and success — with no dead ends.

## Decision

- **TanStack Query v5** owns server state (`src/app/query-client.ts`): caching, dedup, retry, and
  refetch. A client **factory** (not a singleton) gives tests and Storybook isolated caches.
  Defaults: one retry, no refetch-on-focus (live data uses SSE), a short stale time.
- **A single four-state component**, `QueryBoundary` (`src/components/ui/QueryBoundary.tsx`),
  renders exactly one of loading / error / empty / success from a query result. It takes a
  structural `QueryLike` (not the full `UseQueryResult`) so it is trivial to unit-test without a
  QueryClient, an `isEmpty` predicate, and slots to override any state. This makes "all four states,
  every time" the path of least resistance rather than a discipline each screen must remember.
- **Errors** are normalised once (`src/api/errors.ts`): `problem+json` and FastAPI 422 bodies are
  parsed into a form-level message plus per-field messages, so forms and the error state render the
  same source of truth.

## Consequences

- Screens declare _what_ to fetch and _how_ to render success; the four states come for free.
- The four-state behaviour is unit-tested in isolation and demonstrated in Storybook, so it cannot
  silently regress.
- Server state is not duplicated in component state, so there is one cache and one refetch path.
