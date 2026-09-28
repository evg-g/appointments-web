import { QueryClient } from "@tanstack/react-query";

/**
 * Build a QueryClient with defaults suited to this app:
 *   - `retry: 1` — one retry smooths a transient blip without hammering a genuinely-down API.
 *   - `refetchOnWindowFocus: false` — avoids surprise refetches; live data (telemetry) uses SSE.
 *   - a short `staleTime` — reads stay fresh enough without refetching on every mount.
 * A factory (not a singleton) so tests and Storybook each get an isolated cache.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
