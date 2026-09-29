import { render } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router-dom";

import { api } from "@/api/client";
import { AppProviders } from "@/app/AppProviders";
import { createQueryClient } from "@/app/query-client";
import { routes } from "@/app/router";
import { tokensFromResponse, tokenStore } from "@/auth/token-store";
import type { ThemePreference } from "@/theme/theme";

/**
 * Establish an authenticated session for a seed account, bypassing the login form. Call before
 * rendering a route that requires auth; the AuthProvider then hydrates from /auth/me on mount.
 */
export async function loginAs(email: string, password = "password123"): Promise<void> {
  const res = await api.POST("/api/v1/auth/login", { body: { email, password } });
  if (res.data === undefined) throw new Error(`seed login failed for ${email}`);
  tokenStore.set(tokensFromResponse(res.data));
}

interface Options {
  route?: string;
  initialTheme?: ThemePreference;
}

/**
 * Render a component inside the app's provider stack plus an isolated MemoryRouter and a fresh
 * QueryClient. Use for components that consume theme/auth/query/router context.
 */
export function renderWithProviders(ui: ReactElement, options: Options = {}): RenderResult {
  const { route = "/", initialTheme = "light" } = options;
  const queryClient = createQueryClient();
  return render(
    <AppProviders queryClient={queryClient} initialTheme={initialTheme}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </AppProviders>,
  );
}

/**
 * Render the whole application (the real route tree) at a starting URL, inside a MemoryRouter.
 * Use for journey tests: login redirects, route guards, role gating.
 */
export function renderApp(route = "/"): RenderResult {
  const queryClient = createQueryClient();
  const router = createMemoryRouter(routes, { initialEntries: [route] });
  return render(
    <AppProviders queryClient={queryClient} initialTheme="light">
      <RouterProvider router={router} />
    </AppProviders>,
  );
}
