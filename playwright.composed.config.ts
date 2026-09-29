import { defineConfig, devices } from "@playwright/test";

/**
 * Milestone 15: run the E2E *journeys* against the fully composed stack (real API + Postgres +
 * Redis + the web tier), instead of the MSW-backed preview that playwright.config.ts uses.
 *
 * The specs under e2e/journeys are reused unchanged. Only what serves `/api/v1` changes, and that
 * is handled entirely in e2e/support/helpers.ts, which switches on E2E_BACKEND: in "composed" mode
 * it seeds sessions via a real login and forces error scenarios with Playwright's page.route()
 * (spec §6) instead of the MSW control surface, which does not exist in a real-backend build.
 *
 * This config does not start a webServer — the stack is brought up first (`make compose-e2e-up`
 * locally, the e2e-composed CI job in ci.yml) and this run drives it at E2E_BASE_URL. The a11y and
 * visual tiers stay on the MSW build (playwright.config.ts): their snapshots and fully-populated
 * routes are engine- and seed-specific by construction.
 */
process.env.E2E_BACKEND = "composed";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:8080";

export default defineConfig({
  testDir: "./e2e/journeys",
  // The real backend is shared, mutable state; run serially so two workers cannot race for the same
  // clinician slot. There are only a handful of journeys, so this is fast enough.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report-composed", open: "never" }],
    ["junit", { outputFile: "playwright-report-composed/junit.xml" }],
  ],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "en-US",
    timezoneId: "UTC",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
