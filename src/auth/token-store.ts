/**
 * The single source of truth for the current session's tokens.
 *
 * The API issues a short-lived access token and a rotating refresh token (opaque, reuse-detected
 * server-side). This SPA has no backend-for-frontend, so tokens live in the browser. We keep them
 * in memory for the running app and mirror them to localStorage so a page reload does not force a
 * re-login. This trades some XSS exposure for usability; the tradeoff and its mitigations are
 * recorded in docs/adr/0003-auth-token-storage.md.
 *
 * The store is framework-agnostic (plain observable) so both the API client's refresh logic and
 * the React auth layer read the same state without a dependency cycle.
 */
export interface Tokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch ms when the access token expires (advisory; refresh is driven reactively by 401s). */
  expiresAt: number;
}

const STORAGE_KEY = "aurora.auth";

type Listener = (tokens: Tokens | null) => void;

let current: Tokens | null = loadFromStorage();
const listeners = new Set<Listener>();

function loadFromStorage(): Tokens | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as Tokens).accessToken === "string" &&
      typeof (parsed as Tokens).refreshToken === "string" &&
      typeof (parsed as Tokens).expiresAt === "number"
    ) {
      return parsed as Tokens;
    }
    return null;
  } catch {
    return null;
  }
}

function persist(tokens: Tokens | null): void {
  if (typeof window === "undefined") return;
  try {
    if (tokens === null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    }
  } catch {
    // Non-fatal: the session still works in memory for this tab.
  }
}

export const tokenStore = {
  get(): Tokens | null {
    return current;
  },

  getAccessToken(): string | null {
    return current?.accessToken ?? null;
  },

  set(tokens: Tokens): void {
    current = tokens;
    persist(tokens);
    for (const listener of listeners) listener(tokens);
  },

  clear(): void {
    current = null;
    persist(null);
    for (const listener of listeners) listener(null);
  },

  /** Subscribe to token changes; returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** Build a Tokens value from an API TokenResponse, computing an absolute expiry. */
export function tokensFromResponse(response: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}): Tokens {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: Date.now() + response.expires_in * 1000,
  };
}
