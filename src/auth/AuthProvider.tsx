import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

import { api } from "@/api/client";

import { AuthContext } from "./auth-context";
import type { AuthContextValue, AuthStatus, User } from "./auth-context";
import { tokensFromResponse, tokenStore } from "./token-store";

export const ME_QUERY_KEY = ["auth", "me"] as const;

/** Subscribe React to the token store so the provider re-renders when tokens appear or clear. */
function useHasTokens(): boolean {
  return useSyncExternalStore(
    (onChange) => tokenStore.subscribe(onChange),
    () => tokenStore.get() !== null,
    () => false,
  );
}

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const queryClient = useQueryClient();
  const hasTokens = useHasTokens();
  const [loggingIn, setLoggingIn] = useState(false);

  // Resolve the current user whenever we hold tokens. `retry: false` — a 401 here means the
  // session is genuinely invalid (the client already tried to refresh), not a flaky call.
  const meQuery = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: async (): Promise<User> => {
      const { data, error } = await api.GET("/api/v1/auth/me");
      if (error !== undefined) throw error;
      return data;
    },
    enabled: hasTokens,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // If resolving the user fails, the tokens are no good — drop them so the app shows as logged out.
  useEffect(() => {
    if (meQuery.isError) {
      tokenStore.clear();
    }
  }, [meQuery.isError]);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      setLoggingIn(true);
      try {
        const { data, error } = await api.POST("/api/v1/auth/login", {
          body: { email, password },
        });
        if (error !== undefined) throw error;
        tokenStore.set(tokensFromResponse(data));
        // Populate the user immediately so the redirect lands on an authenticated app.
        await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
      } finally {
        setLoggingIn(false);
      }
    },
    [queryClient],
  );

  const logout = useCallback(async (): Promise<void> => {
    const tokens = tokenStore.get();
    try {
      if (tokens !== null) {
        await api.POST("/api/v1/auth/logout", {
          body: { refresh_token: tokens.refreshToken },
        });
      }
    } catch {
      // Best-effort server-side revocation; we clear locally regardless.
    } finally {
      tokenStore.clear();
      queryClient.clear();
    }
  }, [queryClient]);

  const status: AuthStatus = useMemo(() => {
    if (!hasTokens) return "unauthenticated";
    if (loggingIn || meQuery.isPending) return "loading";
    if (meQuery.isSuccess) return "authenticated";
    return "unauthenticated";
  }, [hasTokens, loggingIn, meQuery.isPending, meQuery.isSuccess]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user: meQuery.data ?? null,
      login,
      logout,
    }),
    [status, meQuery.data, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
