import { defineConfig, devices } from "@playwright/test";

/**
 * Showcase screenshots for the READMEs — not a test tier. It serves a build with the opt-in demo
 * dataset (VITE_MSW_DEMO_DATA=true) so pages show realistic data instead of empty states, and writes
 * PNGs to docs/screenshots/. Run with `npm run screenshots`; CI never runs it (the default config
 * ignores e2e/showcase/). Regression baselines stay in e2e/visual/ with the empty, date-free seed.
 */
const PORT = 4174;

export default defineConfig({
  testDir: "./e2e/showcase",
  workers: 1,
  reporter: [["list"]],
  timeout: 60_000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://localhost:${String(PORT)}`,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    locale: "en-US",
    timezoneId: "America/Los_Angeles",
    reducedMotion: "reduce",
  },
  webServer: {
    command: `npm run build:demo && vite preview --outDir dist-demo --port ${String(PORT)} --strictPort`,
    url: `http://localhost:${String(PORT)}`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
