# Exercises — break it on purpose

A UI has its own safety nets: accessibility checks, a contract-generated API client, four designed
states for every async surface, and performance budgets. Each exercise breaks one, so you can watch
the matching gate go red and learn exactly what it guards.

Each exercise: read the **Break**, write down your **Prediction** (which command fails and why), make
the change, run the command under **Catch**, then **Restore** (`git checkout -- <file>`).

All commands run in `# WSL (Ubuntu-24.04)` from the `appointments-web/` directory. The browser tiers
(E2E, a11y, visual, Lighthouse) need the Playwright Chromium browser — `make setup-e2e` — and, on a
managed laptop, the corporate-CA workaround in [docs/BROWSER_TESTING.md](BROWSER_TESTING.md). Vitest,
typecheck, and the client drift gate need none of that.

Companion exercises: `appointments-api/docs/EXERCISES.md` and `aurora-sensor-agent/docs/EXERCISES.md`.

---

## 1. Remove a required ARIA label

**Break.** Drop the accessible name from an interactive control — e.g. remove `aria-label` from an
icon-only button (the theme toggle, or a table row action), or the label association on a form field.

**Predict.** The control still looks fine and works with a mouse. Who can no longer use it, and which
gate refuses to ship it?

**Catch (needs the browser).**

```bash
make e2e-a11y
```

**Why.** An icon button with no text has no accessible name, so a screen reader announces "button" with
no idea what it does — a serious WCAG 2.2 violation. The axe sweep runs on every route in light and
dark and fails on any serious/critical finding, so the missing label fails the gate. Accessibility is
a requirement here, not a nice-to-have (spec §6). See [ADR 0006](adr/0006-browser-test-tiers.md).

**Restore.** `git checkout -- src/`

## 2. Break a color token's contrast

**Break.** In `src/styles/tokens.css`, change a text token to a low-contrast value against its
background — e.g. lighten `--color-text-muted` until it is around 3:1 on the surface.

**Predict.** This is the exact class of bug the a11y gate caught for real during milestone 14 (an
audit-log id at 4.08:1). Which check fails, and at what ratio?

**Catch (needs the browser).**

```bash
make e2e-a11y
```

**Why.** WCAG AA requires 4.5:1 for normal text. axe measures computed contrast on real rendered
pages, so a token that dips below the ratio fails on every route that uses it — in both themes, since
the sweep runs light and dark. Because every component consumes tokens (no hardcoded hex), one token
change is measurable everywhere at once, which is the point of the token layer. See
[ADR 0002](adr/0002-design-tokens-and-theming.md).

**Restore.** `git checkout -- src/`

## 3. Drift the generated API client

**Break.** Edit the vendored contract or the generated client by hand — e.g. rename a field in
`src/api/schema.d.ts` (the generated types) or in the vendored `contracts/openapi.json`, without
regenerating from the other.

**Predict.** The API client is **generated** from the backend's OpenAPI, never hand-written. Which gate
notices that the committed client no longer matches the contract, and does `tsc` care too?

**Catch (no browser).**

```bash
make check-client       # drift gate: committed client vs the contract
make typecheck          # tsc --noEmit
```

**Why.** The drift gate regenerates the client from `contracts/openapi.json` and fails if the result
differs from what is committed, so a backend change that reaches the front end breaks **loudly** at
build time instead of silently at runtime. If your hand-edit also makes call sites reference a field
that no longer exists in the types, `tsc` fails as well. See
[ADR 0001](adr/0001-generate-api-client-from-openapi.md) and the API's
[CONTRACT_WORKFLOW.md](https://github.com/evg-g/appointments-api/blob/main/docs/CONTRACT_WORKFLOW.md).

**Restore.** `git checkout -- src/ contracts/`

## 4. Remove the optimistic-update rollback

**Break.** In the booking flow (`src/features/appointments/BookingFlow.tsx` and its mutation hook),
keep the optimistic insert but remove the `onError` rollback (do not restore the cache when the create
fails).

**Predict.** The user books a slot; the server rejects it with `409` (someone else just took it). What
does the user see with no rollback, and which test asserts the correct behaviour?

**Catch (no browser).**

```bash
make test
```

**Why.** Optimistic updates make the UI feel instant by showing the change before the server confirms
— but they are only safe if a failure rolls the change back. The component test forces a `409` via MSW
and asserts the phantom appointment disappears and an error is shown. Remove the rollback and the
phantom sticks, so the test fails. See [ADR 0005](adr/0005-feature-architecture-and-live-data.md).

**Restore.** `git checkout -- src/`

## 5. Drop a four-state branch

**Break.** In a data-driven surface (e.g. the cold-chain dashboard or the audit log), remove the
**error** state — render only loading and success, so a failed query shows a blank or a spinner
forever.

**Predict.** MSW can force a request to fail. Which state does the test expect, and what does the user
get without it?

**Catch (no browser).**

```bash
make test
```

**Why.** Every async surface must render exactly one of four **designed** states — loading, empty,
error (with retry), success — with no dead ends (spec §6). The component test drives the error handler
via MSW and asserts an error message with a retry affordance appears. Remove the error branch and the
user is stuck on a spinner; the test fails. This is what `QueryBoundary` exists to enforce — see
[ADR 0004](adr/0004-server-state-and-four-states.md).

**Restore.** `git checkout -- src/`

## 6. Skip `If-Match` on an appointment transition

**Break.** In `src/features/appointments/AppointmentDetail.tsx` (or its transition/cancel hook), stop
sending the `If-Match` header derived from the appointment's `ETag`.

**Predict.** Two staff open the same appointment; one confirms, the other cancels a moment later using
a now-stale view. The API answers `412`. How should the UI react, and which test checks it?

**Catch (no browser).**

```bash
make test
```

**Why.** The backend uses `ETag` / `If-Match` for optimistic concurrency (a stale edit gets `412`). The
UI has to send the current `ETag` and handle the `412` cleanly — refetch and tell the user the item
changed. The detail test simulates a stale transition and asserts the `412` is surfaced, not swallowed.
Drop the header and the request either fails differently or clobbers the newer state, and the test
fails.

**Restore.** `git checkout -- src/`

## 7. Blow the performance budget

**Break.** Undo code-splitting for a feature route — import a heavy feature page (or a large library)
**eagerly** at the top of `src/app/router.tsx` instead of via `React.lazy`.

**Predict.** The app still works. What grows, and which two gates are watching it?

**Catch (needs the browser for Lighthouse).**

```bash
make bundle-check       # gzipped initial/total budget (build only, no browser)
make lighthouse         # LCP / CLS / TBT budgets
```

**Why.** Route-level `React.lazy` keeps the initial bundle small (≈184 kB gz) by loading a feature's
code only when you navigate to it. Import it eagerly and it lands in the initial chunk; the
bundle-size gate fails against its budget, and Lighthouse's LCP/TBT worsen as the browser parses more
JavaScript up front. Budgets turn "the app feels heavy" into a number CI can block on. See
[ADR 0006](adr/0006-browser-test-tiers.md) and [docs/BROWSER_TESTING.md](BROWSER_TESTING.md).

**Restore.** `git checkout -- src/`
