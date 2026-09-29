#!/usr/bin/env node
/**
 * Run Lighthouse CI against the production build using the Chromium that Playwright already
 * manages, so no separate system Chrome install is needed (locally or in CI). Budgets live in
 * lighthouserc.json. Assumes `npm run build` has produced ./dist.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

if (!existsSync(join(root, "dist", "index.html"))) {
  console.error('No build found at ./dist. Run "npm run build" first.');
  process.exit(1);
}

const chromePath = chromium.executablePath();
const lhci = join(root, "node_modules", ".bin", "lhci");

const result = spawnSync(lhci, ["autorun"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, CHROME_PATH: chromePath },
});

process.exit(result.status ?? 1);
