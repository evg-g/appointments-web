import { describe, expect, it } from "vitest";

import { tokenStore } from "@/auth/token-store";

import { api } from "./client";

async function seedSession(): Promise<{ refresh_token: string }> {
  const login = await api.POST("/api/v1/auth/login", {
    body: { email: "patient@aurora.test", password: "password123" },
  });
  if (login.data === undefined) throw new Error("login failed in test setup");
  return login.data;
}

describe("api client auth middleware", () => {
  it("refreshes once on a 401 and retries the original request", async () => {
    const tokens = await seedSession();
    // Access token is stale but the refresh token is valid — forces a refresh-and-retry.
    tokenStore.set({
      accessToken: "stale-access-token",
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + 60_000,
    });

    const me = await api.GET("/api/v1/auth/me");

    expect(me.error).toBeUndefined();
    expect(me.data?.email).toBe("patient@aurora.test");
    // The store now holds the freshly rotated access token.
    expect(tokenStore.getAccessToken()).toMatch(/^mock-access-/);
  });

  it("clears the session when the refresh also fails", async () => {
    tokenStore.set({
      accessToken: "stale-access-token",
      refreshToken: "not-a-valid-refresh-token",
      expiresAt: Date.now() + 60_000,
    });

    const me = await api.GET("/api/v1/auth/me");

    expect(me.response.status).toBe(401);
    expect(tokenStore.get()).toBeNull();
  });

  it("passes a 401 through untouched when there is no session to refresh", async () => {
    const me = await api.GET("/api/v1/auth/me");

    expect(me.response.status).toBe(401);
    expect(tokenStore.get()).toBeNull();
  });
});
