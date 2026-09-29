// Runs before every test file. Adds jest-dom matchers, wires the MSW server, and resets all
// shared state between tests so nothing leaks from one test into the next.
import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

import { tokenStore } from "@/auth/token-store";
import { resetMockState } from "@/mocks/handlers";
import { server } from "@/mocks/server";

// findBy*/waitFor default to 1s. Full-app renders (lazy routes, MSW, the chart) can exceed that on a
// loaded machine or a shared CI runner, which made a few tests flaky. 5s is still a hard ceiling:
// a real regression (the element never appears) still fails, just later.
configure({ asyncUtilTimeout: 5000 });

// jsdom lacks these; several components (theme, Radix) touch them.
if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList;
}

if (typeof window.ResizeObserver === "undefined") {
  window.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

// Unhandled requests are a test bug — fail loudly rather than hitting the network.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockState();
  tokenStore.clear();
  try {
    localStorage.clear();
  } catch {
    // ignore
  }
});

afterAll(() => server.close());
