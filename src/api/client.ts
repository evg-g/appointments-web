import createClient from "openapi-fetch";

import { tokensFromResponse, tokenStore } from "@/auth/token-store";

import type { components, paths } from "./schema";

/**
 * Base URL for the API. Point VITE_API_URL at the backend when running the web app against a
 * separately hosted API. Otherwise we use the current origin (the composed stack serves the API
 * under /api/v1 on the same origin). Resolving to an absolute origin — rather than "" — keeps the
 * fetch layer working under jsdom/node, where relative URLs cannot be parsed.
 */
function resolveBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv !== undefined && fromEnv !== "") return fromEnv;
  if (typeof window !== "undefined" && window.location.origin !== "") {
    return window.location.origin;
  }
  return "";
}

export const API_BASE_URL: string = resolveBaseUrl();

const LOGIN_PATH = "/api/v1/auth/login";
const REFRESH_PATH = "/api/v1/auth/refresh";

type TokenResponse = components["schemas"]["TokenResponse"];

function isAuthEntryEndpoint(url: string): boolean {
  // The login and refresh calls must not themselves trigger a refresh-retry loop.
  return url.includes(LOGIN_PATH) || url.includes(REFRESH_PATH);
}

/** Return a copy of the request with the current access token attached, if we have one. */
function withAccessToken(request: Request): Request {
  const accessToken = tokenStore.getAccessToken();
  if (accessToken === null) return request;
  const headers = new Headers(request.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return new Request(request, { headers });
}

// Single-flight refresh: concurrent 401s share one refresh round-trip.
let refreshInFlight: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const existing = tokenStore.get();
  if (existing === null) return false;

  refreshInFlight ??= (async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}${REFRESH_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: existing.refreshToken }),
      });
      if (!response.ok) {
        tokenStore.clear();
        return false;
      }
      const body = (await response.json()) as TokenResponse;
      tokenStore.set(tokensFromResponse(body));
      return true;
    } catch {
      // Network failure: keep the tokens (it may be transient) but report the refresh failed.
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/**
 * Custom fetch that (1) attaches the bearer token, and (2) transparently refreshes once on a 401
 * and retries the original request. openapi-fetch hands us a whole Request, so we clone it up front
 * to have an un-consumed copy to retry with.
 */
async function authenticatingFetch(input: Request): Promise<Response> {
  const retryable = input.clone();
  const response = await fetch(withAccessToken(input));

  if (response.status !== 401 || isAuthEntryEndpoint(input.url)) {
    return response;
  }

  const refreshed = await refreshTokens();
  if (!refreshed) {
    return response;
  }
  return fetch(withAccessToken(retryable));
}

/**
 * The typed API client. Every method is generated from the OpenAPI contract, so a backend change
 * that the web app depends on shows up as a TypeScript error here, not a runtime surprise.
 */
export const api = createClient<paths>({
  baseUrl: API_BASE_URL,
  fetch: authenticatingFetch,
});
