#!/usr/bin/env node
/**
 * Enforced bundle-size budget (milestone 14). Fails the build when the JavaScript the browser must
 * download grows past budget. Two numbers are checked, both gzipped (what actually crosses the
 * wire):
 *
 *   - initial: the entry chunk plus everything index.html preloads — the cost of first paint.
 *   - total:   every emitted JS chunk, including the on-demand route chunks.
 *
 * Route-level code-splitting (src/app/router.tsx) and vendor chunking (vite.config.ts) keep the
 * initial number small; this gate stops that from regressing. Lighthouse (lighthouserc.json)
 * covers the runtime metrics (LCP/CLS/TBT) separately.
 */
import { gzipSync } from "node:zlib";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const KB = 1024;
const BUDGET = {
  initialGzip: 235 * KB,
  totalGzip: 265 * KB,
};

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const indexHtml = join(dist, "index.html");

if (!existsSync(indexHtml)) {
  console.error(`No build found at ${dist}. Run "npm run build" first.`);
  process.exit(1);
}

function gzipBytes(path) {
  return gzipSync(readFileSync(path)).length;
}

const html = readFileSync(indexHtml, "utf8");
// Entry <script type="module" src> and every <link rel="modulepreload" href>: the initial graph.
const referenced = new Set();
for (const match of html.matchAll(/(?:src|href)="\/?(assets\/[^"]+\.js)"/g)) {
  referenced.add(match[1]);
}

const assetsDir = join(dist, "assets");
const allJs = readdirSync(assetsDir).filter((f) => f.endsWith(".js"));

let initial = 0;
let total = 0;
const rows = [];
for (const file of allJs.sort()) {
  const gz = gzipBytes(join(assetsDir, file));
  total += gz;
  const isInitial = referenced.has(`assets/${file}`);
  if (isInitial) initial += gz;
  rows.push({ file, gz, isInitial });
}

const fmt = (n) => `${(n / KB).toFixed(1)} kB`;
const pct = (n, budget) => `${((n / budget) * 100).toFixed(0)}%`;

const lines = [];
lines.push("Bundle size (gzipped)");
lines.push("");
for (const r of rows.sort((a, b) => b.gz - a.gz)) {
  lines.push(`  ${r.isInitial ? "▸" : " "} ${r.file.padEnd(40)} ${fmt(r.gz).padStart(10)}`);
}
lines.push("");
lines.push(
  `  initial (▸ entry + preloads): ${fmt(initial)}  / ${fmt(BUDGET.initialGzip)}  (${pct(initial, BUDGET.initialGzip)})`,
);
lines.push(
  `  total   (all JS chunks):      ${fmt(total)}  / ${fmt(BUDGET.totalGzip)}  (${pct(total, BUDGET.totalGzip)})`,
);
console.log(lines.join("\n"));

// Publish to the CI job summary when running in GitHub Actions.
const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  const md = [
    "### Bundle size (gzipped)",
    "",
    "| Metric | Size | Budget | Used |",
    "| --- | ---: | ---: | ---: |",
    `| Initial (entry + preloads) | ${fmt(initial)} | ${fmt(BUDGET.initialGzip)} | ${pct(initial, BUDGET.initialGzip)} |`,
    `| Total (all JS) | ${fmt(total)} | ${fmt(BUDGET.totalGzip)} | ${pct(total, BUDGET.totalGzip)} |`,
    "",
  ].join("\n");
  try {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(summaryPath, `${md}\n`);
  } catch {
    // Non-fatal: the summary is a nicety, the gate below is what matters.
  }
}

const failures = [];
if (initial > BUDGET.initialGzip) {
  failures.push(`initial JS ${fmt(initial)} exceeds budget ${fmt(BUDGET.initialGzip)}`);
}
if (total > BUDGET.totalGzip) {
  failures.push(`total JS ${fmt(total)} exceeds budget ${fmt(BUDGET.totalGzip)}`);
}

if (failures.length > 0) {
  console.error(`\nBundle-size budget exceeded:\n  - ${failures.join("\n  - ")}`);
  process.exit(1);
}
console.log("\nBundle-size budget: OK");
