import { defineConfig, devices } from "@playwright/test";

/**
 * Browser test tiers for milestone 14 — E2E journeys, axe accessibility, and visual regression.
 *
 * The app under test is the real production build, served by `vite preview`, with the app's own
 * typed MSW backend supplying the network (VITE_ENABLE_MSW=true). That keeps these tests
 * deterministic and hardware/Docker-free: the same seeded backend and named error scenarios the
 * component tests use, driven in a real browser. Running the journeys against the fully composed
 * stack (real API + Postgres + Redis) is milestone 15's CI concern; the specs themselves do not
 * change, only what serves `/api/v1`.
 *
 * Engines: Chromium is the locally-verified engine (and the target for visual + Lighthouse). WebKit
 * is added for the journey and a11y tiers when PW_ALL_BROWSERS=1 (set in CI, where
 * `playwright install --with-deps` provides its system libraries), matching the spec's "Chromium
 * plus one WebKit shard". Visual snapshots stay Chromium-only — screenshot baselines are
 * engine-specific.
 */
const PORT = 4173;
const BASE_URL = `http://localhost:${String(PORT)}`;
const allBrowsers = process.env.PW_ALL_BROWSERS === "1";

export default defineConfig({
  testDir: "./e2e",
  // e2e/showcase/ only makes README screenshots, and e2e/pages/ targets the GitHub Pages build;
  // each has its own config (playwright.showcase.config.ts, playwright.pages.config.ts).
  testIgnore: [/showcase\//, /pages\//],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["junit", { outputFile: "playwright-report/junit.xml" }],
  ],
  timeout: 30_000,
  expect: {
    timeout: 7_500,
    toHaveScreenshot: {
      // Absorb sub-pixel anti-aliasing differences while still catching real regressions.
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    },
  },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Pin locale + timezone so date-driven UI (availability weekday, formatted times) and visual
    // snapshots are identical on every machine.
    locale: "en-US",
    timezoneId: "UTC",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    ...(allBrowsers
      ? [
          {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
            // Visual baselines are engine-specific; keep them on one engine. A project-level
            // testIgnore replaces the top-level one, so showcase/ and pages/ are listed again here.
            testIgnore: [/visual\//, /showcase\//, /pages\//],
          },
        ]
      : []),
  ],
  webServer: {
    command: "npm run build:e2e && npm run preview:e2e",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
