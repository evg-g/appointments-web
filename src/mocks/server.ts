import { setupServer } from "msw/node";

import { handlers } from "./handlers";

/** MSW server for Vitest (Node). Started/stopped in src/test/setup.ts. */
export const server = setupServer(...handlers);
