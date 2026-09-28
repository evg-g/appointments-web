import { setupWorker } from "msw/browser";

import { handlers } from "./handlers";

/** MSW worker for the dev server. Only started when VITE_ENABLE_MSW=true (see main.tsx). */
export const worker = setupWorker(...handlers);

export async function startMockWorker(): Promise<void> {
  await worker.start({ onUnhandledRequest: "bypass" });
}
