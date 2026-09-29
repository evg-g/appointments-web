import { setupWorker } from "msw/browser";

import { seedDemoData } from "./db";
import { handlers, scenarios } from "./handlers";

/** MSW worker for the dev server and the browser E2E build. Only started when VITE_ENABLE_MSW=true. */
export const worker = setupWorker(...handlers);

export type ScenarioName = keyof typeof scenarios;

function isScenarioName(value: unknown): value is ScenarioName {
  return typeof value === "string" && value in scenarios;
}

/**
 * A small, typed control surface the Playwright E2E suite drives to force error and edge states at
 * the network layer — the same named `scenarios` the component tests use, so nothing can drift from
 * the contract. It is attached to `window` only in an MSW-enabled build (dev/E2E), never in prod,
 * because this module is loaded solely behind the VITE_ENABLE_MSW guard in main.tsx.
 */
export interface E2eControls {
  /** Prepend a runtime handler for a named error scenario (e.g. a 409 on the next booking). */
  useScenario: (name: ScenarioName) => void;
  /** Drop all runtime overrides, returning to the seeded happy-path backend. */
  reset: () => void;
}

declare global {
  interface Window {
    __aurora_e2e?: E2eControls;
    /**
     * Scenarios to apply the moment the worker starts. Set by the E2E suite via addInitScript so an
     * error state survives full-page navigations, which drop runtime `worker.use` overrides.
     */
    __aurora_e2e_boot?: unknown;
  }
}

function applyScenario(name: ScenarioName): void {
  worker.use(scenarios[name]());
}

function installE2eControls(): void {
  const boot = window.__aurora_e2e_boot;
  if (Array.isArray(boot)) {
    for (const name of boot) {
      if (isScenarioName(name)) applyScenario(name);
    }
  }
  window.__aurora_e2e = {
    useScenario(name) {
      applyScenario(name);
    },
    reset() {
      worker.resetHandlers();
    },
  };
}

export async function startMockWorker(): Promise<void> {
  if (import.meta.env.VITE_MSW_DEMO_DATA === "true") seedDemoData();
  await worker.start({
    onUnhandledRequest: "bypass",
    quiet: true,
    // Served next to index.html, so this also works under a sub-path (the GitHub Pages demo).
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  });
  installE2eControls();
}
