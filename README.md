# appointments-web

The web front end for **Aurora Clinic** — appointment scheduling and cold-chain monitoring.
React 19, TypeScript (strict), Vite.

One of three repos in the system — see the top-level `README.md`.

## Why this exists

A genuinely professional UI on top of the API: role-aware scheduling, a booking flow, admin
views, and a live cold-chain dashboard. It is where design-token discipline, accessibility,
and the four async states (loading / empty / error / success) are practised, and where the
API client is generated from the backend's OpenAPI schema rather than hand-written.

## Status

Milestone 1 (scaffolding). Currently a single landing view with the toolchain, strict
TypeScript, linting, and tests wired up. Design tokens, routing, the generated API client,
and features arrive from milestone 12 onward.

## Quick start

```bash
# WSL (Ubuntu-24.04)
make setup     # npm ci (or npm install on first run)
make test      # run Vitest
make dev       # start Vite on http://localhost:5173
```

## Layout

```
src/
  App.tsx        # application shell
  test/setup.ts  # test bootstrap (jest-dom matchers, cleanup)
```

## License

MIT — see `LICENSE`.
