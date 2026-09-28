// Runs before every test file. Adds jest-dom matchers, wires the MSW server, and resets all
// shared state between tests so nothing leaks from one test into the next.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

import { tokenStore } from "@/auth/token-store";
import { resetMockState } from "@/mocks/handlers";
import { server } from "@/mocks/server";

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
