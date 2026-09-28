import { beforeEach, describe, expect, it, vi } from "vitest";

import { tokensFromResponse, tokenStore } from "./token-store";

describe("tokenStore", () => {
  beforeEach(() => {
    tokenStore.clear();
    localStorage.clear();
  });

  it("stores and returns the current tokens", () => {
    tokenStore.set({ accessToken: "a", refreshToken: "r", expiresAt: 123 });

    expect(tokenStore.get()).toEqual({ accessToken: "a", refreshToken: "r", expiresAt: 123 });
    expect(tokenStore.getAccessToken()).toBe("a");
  });

  it("clears tokens", () => {
    tokenStore.set({ accessToken: "a", refreshToken: "r", expiresAt: 123 });
    tokenStore.clear();

    expect(tokenStore.get()).toBeNull();
    expect(tokenStore.getAccessToken()).toBeNull();
  });

  it("persists to localStorage so a reload keeps the session", () => {
    tokenStore.set({ accessToken: "a", refreshToken: "r", expiresAt: 123 });

    const raw = localStorage.getItem("aurora.auth");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw ?? "{}")).toMatchObject({ accessToken: "a", refreshToken: "r" });
  });

  it("notifies subscribers on change and stops after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = tokenStore.subscribe(listener);

    tokenStore.set({ accessToken: "a", refreshToken: "r", expiresAt: 1 });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    tokenStore.clear();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("tokensFromResponse", () => {
  it("computes an absolute expiry from expires_in", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000_000);

    const tokens = tokensFromResponse({
      access_token: "a",
      refresh_token: "r",
      expires_in: 900,
    });

    expect(tokens).toEqual({ accessToken: "a", refreshToken: "r", expiresAt: 1_000_000 + 900_000 });
    vi.restoreAllMocks();
  });
});
