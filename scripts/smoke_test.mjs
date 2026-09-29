#!/usr/bin/env node
// Post-deploy smoke test for the web tier, used by cd.yml after each deploy.
//
// It is deliberately small and dependency-free: prove the deployed SPA shell loads and that the
// nginx reverse-proxy reaches the API. A green smoke here means the container started, the static
// bundle is served, client-side routing's fallback works, and /api is wired to a live backend.
//
// Usage:  node scripts/smoke_test.mjs --base-url https://web-staging.example.com

function parseBaseUrl() {
  const idx = process.argv.indexOf("--base-url");
  const fromFlag = idx !== -1 ? process.argv[idx + 1] : undefined;
  const base = fromFlag ?? process.env.SMOKE_BASE_URL;
  if (!base) {
    console.error("Usage: node scripts/smoke_test.mjs --base-url <url>");
    process.exit(2);
  }
  return base.replace(/\/$/, "");
}

async function get(url, init) {
  const res = await fetch(url, init);
  const body = await res.text();
  return { status: res.status, body, headers: res.headers };
}

async function main() {
  const base = parseBaseUrl();
  const checks = [];

  // 1. The app shell loads at the root.
  const root = await get(`${base}/`);
  checks.push(["GET /", root.status === 200 && root.body.includes('id="root"')]);

  // 2. A deep client-side route falls back to the SPA shell (history-API routing works).
  const deep = await get(`${base}/login`);
  checks.push([
    "GET /login (SPA fallback)",
    deep.status === 200 && deep.body.includes('id="root"'),
  ]);

  // 3. The reverse-proxied API health endpoint responds through the web origin.
  const ready = await get(`${base}/health/ready`);
  checks.push(["GET /health/ready (proxied)", ready.status === 200]);

  let ok = true;
  for (const [name, passed] of checks) {
    console.log(`${passed ? "PASS" : "FAIL"}  ${name}`);
    if (!passed) ok = false;
  }
  if (!ok) {
    console.error("Smoke test failed.");
    process.exit(1);
  }
  console.log("Smoke test passed.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
