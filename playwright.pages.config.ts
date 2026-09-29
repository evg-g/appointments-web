import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke test for the GitHub Pages site (the live demo), run by pages.yml before it deploys. It builds
 * the demo with the /appointments-web/ base and serves it with scripts/serve-pages.mjs, which copies
 * the Pages rules (sub-path, 404.html fallback), so a broken base path or deep link fails here first.
 */
const PORT = 4175;

export default defineConfig({
  testDir: "./e2e/pages",
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://localhost:${String(PORT)}`,
    locale: "en-US",
  },
  webServer: {
    command: `npm run build:pages && node scripts/serve-pages.mjs dist-pages ${String(PORT)}`,
    url: `http://localhost:${String(PORT)}/appointments-web/`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
