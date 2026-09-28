import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Group node_modules into stable vendor chunks so a page only downloads the libraries it needs and
 * browser caching survives app-code changes. Feature pages are additionally split by route via
 * React.lazy (see src/app/router.tsx). Budgets on the result are enforced in CI (milestone 14):
 * scripts/check-bundle-size.mjs and Lighthouse (lighthouserc.json).
 */
function vendorChunk(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined;
  if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react";
  if (id.includes("node_modules/react-router")) return "react-router";
  if (id.includes("node_modules/@tanstack")) return "query";
  if (id.includes("node_modules/@radix-ui") || id.includes("node_modules/lucide-react")) {
    return "ui";
  }
  if (
    id.includes("node_modules/react-hook-form") ||
    id.includes("node_modules/@hookform") ||
    id.includes("node_modules/zod")
  ) {
    return "forms";
  }
  return "vendor";
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    // Real budgets are enforced separately (bundle-size script + Lighthouse); this only silences
    // Rollup's generic warning so a legitimate build is not noisy.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    css: false,
    // Vitest owns the unit + component tests under src/. The Playwright specs under e2e/ import
    // @playwright/test and must not be collected here (they run via `npm run e2e`).
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Deterministic time: render timezone-dependent output in a fixed zone (spec §6).
    env: { TZ: "UTC" },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.stories.{ts,tsx}",
        "src/test/**",
        "src/mocks/**",
        "src/main.tsx",
        "src/api/schema.d.ts",
      ],
    },
  },
});
