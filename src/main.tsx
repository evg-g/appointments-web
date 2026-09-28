import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { AppProviders } from "@/app/AppProviders";
import { router } from "@/app/router";

import "./styles/global.css";

async function enableMocksIfRequested(): Promise<void> {
  // Opt-in API mocking for the dev server (same handlers the tests use), so the UI can be driven
  // without a running backend. Off unless VITE_ENABLE_MSW=true.
  if (import.meta.env.VITE_ENABLE_MSW === "true") {
    const { startMockWorker } = await import("@/mocks/browser");
    await startMockWorker();
  }
}

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("Root element #root not found in index.html");
}

void enableMocksIfRequested().then(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  );
});
