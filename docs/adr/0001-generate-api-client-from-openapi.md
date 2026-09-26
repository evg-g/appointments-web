# 1. Generate the API client from the backend's OpenAPI schema

- Status: accepted
- Date: 2026-09-26

## Context

The front end and the API are separate repos that deploy independently. If the front end
hand-writes its request and response types, they drift from the real API silently: a renamed
field or a changed status code compiles fine on the web side and breaks only at runtime.

## Decision

The web app **generates** its TypeScript types and client from the backend's committed
`openapi.json` (via `openapi-typescript` + `openapi-fetch`). CI regenerates and fails if the
output differs from what is committed (a drift check). MSW mock handlers are typed against the
same generated types, so a contract change breaks the mocks too. This is wired up in
milestone 12; the ADR is recorded now because it shapes how the client layer is designed.

## Consequences

- An API change that affects the front end shows up as a type error or a failed drift check,
  not a runtime surprise.
- The web repo depends on the backend's published contract artifact.
- Generated files are committed so reviewers can see the diff.
