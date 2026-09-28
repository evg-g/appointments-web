import { http, HttpResponse } from "msw";

import type { components } from "@/api/schema";

import { problem, SEED_ACCOUNTS } from "./data";
import type { TokenResponse, UserOut } from "./data";

type LoginRequest = components["schemas"]["LoginRequest"];
type RefreshRequest = components["schemas"]["RefreshRequest"];
type HTTPValidationError = components["schemas"]["HTTPValidationError"];

// In-memory session state. Reset between tests via resetMockState().
const accessTokens = new Map<string, UserOut>();
const refreshTokens = new Map<string, string>(); // refreshToken -> email
let counter = 0;

function issueTokens(user: UserOut): TokenResponse {
  counter += 1;
  const accessToken = `mock-access-${user.role}-${String(counter)}`;
  const refreshToken = `mock-refresh-${user.role}-${String(counter)}`;
  accessTokens.set(accessToken, user);
  refreshTokens.set(refreshToken, user.email);
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "bearer",
    expires_in: 900,
  };
}

export function resetMockState(): void {
  accessTokens.clear();
  refreshTokens.clear();
  counter = 0;
}

function bearerUser(request: Request): UserOut | null {
  const header = request.headers.get("Authorization");
  if (header === null || !header.startsWith("Bearer ")) return null;
  return accessTokens.get(header.slice("Bearer ".length)) ?? null;
}

/** Default, happy-path handlers. Tests override individual routes with server.use(...). */
export const handlers = [
  http.post("/api/v1/auth/login", async ({ request }) => {
    const body = (await request.json()) as LoginRequest;
    const account = SEED_ACCOUNTS.find((a) => a.user.email === body.email);
    if (account === undefined || account.password !== body.password) {
      return HttpResponse.json(problem(401, "Unauthorized", "Invalid email or password."), {
        status: 401,
      });
    }
    return HttpResponse.json<TokenResponse>(issueTokens(account.user));
  }),

  http.post("/api/v1/auth/refresh", async ({ request }) => {
    const body = (await request.json()) as RefreshRequest;
    const email = refreshTokens.get(body.refresh_token);
    if (email === undefined) {
      return HttpResponse.json(problem(401, "Unauthorized", "Invalid refresh token."), {
        status: 401,
      });
    }
    // Rotate: the presented refresh token is single-use.
    refreshTokens.delete(body.refresh_token);
    const account = SEED_ACCOUNTS.find((a) => a.user.email === email);
    if (account === undefined) {
      return HttpResponse.json(problem(401, "Unauthorized", "Unknown account."), { status: 401 });
    }
    return HttpResponse.json<TokenResponse>(issueTokens(account.user));
  }),

  http.post("/api/v1/auth/logout", async ({ request }) => {
    const body = (await request.json()) as RefreshRequest;
    refreshTokens.delete(body.refresh_token);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/v1/auth/me", ({ request }) => {
    const user = bearerUser(request);
    if (user === null) {
      return HttpResponse.json(problem(401, "Unauthorized", "Not authenticated."), { status: 401 });
    }
    return HttpResponse.json<UserOut>(user);
  }),
];

/**
 * Named error scenarios for the four-state tests. Each returns a handler to pass to server.use().
 */
export const scenarios = {
  loginInvalidCredentials: () =>
    http.post("/api/v1/auth/login", () =>
      HttpResponse.json(problem(401, "Unauthorized", "Invalid email or password."), {
        status: 401,
      }),
    ),

  loginValidationError: () =>
    http.post("/api/v1/auth/login", () =>
      HttpResponse.json<HTTPValidationError>(
        {
          detail: [
            {
              loc: ["body", "email"],
              msg: "value is not a valid email address",
              type: "value_error",
            },
          ],
        },
        { status: 422 },
      ),
    ),

  loginServerError: () =>
    http.post("/api/v1/auth/login", () =>
      HttpResponse.json(problem(500, "Internal Server Error", "Unexpected error."), {
        status: 500,
      }),
    ),

  loginNetworkError: () => http.post("/api/v1/auth/login", () => HttpResponse.error()),

  meUnauthorized: () =>
    http.get("/api/v1/auth/me", () =>
      HttpResponse.json(problem(401, "Unauthorized", "Not authenticated."), { status: 401 }),
    ),
};
