#!/usr/bin/env node
/**
 * Serve a built site the way GitHub Pages does, so the Pages smoke test runs against the same rules:
 * files live under /<repo>/ (here /appointments-web/), and a path with no file gets 404.html with a
 * 404 status (that is how the SPA's deep links work on Pages).
 *
 * Usage: node scripts/serve-pages.mjs <dir> <port>
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const [dir = "site", port = "4175"] = process.argv.slice(2);
const BASE = "/appointments-web/";
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".zip": "application/zip",
};

function send(res, status, file) {
  res.writeHead(status, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
  if (!path.startsWith(BASE)) {
    res.writeHead(404).end("not under the Pages base path");
    return;
  }
  let file = normalize(join(dir, path.slice(BASE.length)));
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (existsSync(file)) send(res, 200, file);
  else send(res, 404, join(dir, "404.html"));
}).listen(Number(port), () => {
  console.log(`serving ${dir} at http://localhost:${port}${BASE}`);
});
