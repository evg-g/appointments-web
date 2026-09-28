# 3. SPA authentication and token storage

- Status: accepted
- Date: 2026-09-28

## Context

The API issues a short-lived JWT access token plus a rotating, reuse-detected refresh token
(ADR 0005 in appointments-api). The web app is a single-page app with no backend-for-frontend to
hold tokens in an HttpOnly cookie. We need: the access token attached to API calls, a transparent
refresh when it expires, a session that survives a page reload, and a clean logout — without
scattering token logic through components.

## Decision

- **One token store** (`src/auth/token-store.ts`): a small framework-agnostic observable holding
  the tokens. It is the single source of truth, read by both the API client's refresh logic and
  the React auth layer, which avoids a dependency cycle.
- **Storage.** Tokens are kept in memory and mirrored to `localStorage`, so a reload keeps the
  session. This is a deliberate tradeoff: `localStorage` is readable by injected script, so it
  trades some XSS exposure for usability. Mitigations: the app has no `dangerouslySetInnerHTML`,
  a strict dependency policy, and access tokens are short-lived. A cookie/BFF design is the
  documented hardening path (see KNOWN_GAPS).
- **Attachment + refresh in the client** (`src/api/client.ts`): a custom `fetch` attaches the
  bearer token and, on a 401 for a non-auth endpoint, performs a **single-flight** refresh and
  retries the original request once. Concurrent 401s share one refresh round-trip. If the refresh
  fails, the store is cleared and the 401 propagates — the app then renders as logged out.
- **React layer** (`AuthProvider`): resolves the current user via `/auth/me` with TanStack Query
  whenever tokens are present (`retry: false`, since a 401 here means the session is genuinely
  invalid). `login` sets tokens then invalidates the user query; `logout` best-effort revokes the
  refresh token server-side, then clears local state.
- **Guards.** `ProtectedRoute` gates authenticated routes (spinner while resolving, redirect to
  `/login` with the attempted location otherwise). `RequireRole`/`RoleGate` handle authorization at
  the route and UI level.

## Consequences

- Refresh is invisible to feature code: any `api.*` call just works, and a mid-session expiry is
  recovered without a user-visible failure.
- Reload keeps the session; the XSS tradeoff is explicit and has a named hardening path.
- Refresh is reactive (on 401), not proactive; `expiresAt` is recorded for a future proactive
  refresh but not yet used.
