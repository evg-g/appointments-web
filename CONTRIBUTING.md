# Contributing to appointments-web

## Setup

```bash
# WSL (Ubuntu-24.04)
make setup
```

Uses Node 20+ and npm. `package-lock.json` is committed; `npm ci` reproduces it exactly.

## Before you push

```bash
# WSL (Ubuntu-24.04)
make ci-local
```

Runs ESLint, Prettier check, `tsc --noEmit`, and Vitest. If it passes locally, it passes in CI.

## Rules

- TypeScript `strict`: no `any`, no non-null `!` without a comment explaining why it is safe.
- Test user-visible behaviour, not implementation. Query by role/label, never by test id.
- No hardcoded colours or arbitrary pixel values in components (once design tokens land).
- Conventional Commits. Non-obvious decisions get an ADR in `docs/adr/`.
