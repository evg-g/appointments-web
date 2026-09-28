import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { api } from "@/api/client";
import { tokensFromResponse, tokenStore } from "@/auth/token-store";
import { scenarios } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { renderApp } from "@/test/utils";

async function fillCredentials(email: string, password: string): Promise<void> {
  await userEvent.type(screen.getByLabelText(/email/i), email);
  await userEvent.type(screen.getByLabelText(/password/i), password);
  await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
}

/** Seed an authenticated session for a seed account (bypasses the form). */
async function loginAs(email: string): Promise<void> {
  const res = await api.POST("/api/v1/auth/login", { body: { email, password: "password123" } });
  if (res.data === undefined) throw new Error("seed login failed");
  tokenStore.set(tokensFromResponse(res.data));
}

describe("authentication journeys", () => {
  it("redirects an unauthenticated visitor to the login screen", async () => {
    renderApp("/");
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  it("signs in with valid credentials and lands on the dashboard", async () => {
    renderApp("/login");
    await fillCredentials("patient@aurora.test", "password123");

    expect(await screen.findByText(/welcome, pat/i)).toBeInTheDocument();
    // Desktop and mobile navs both render the links (responsive layout).
    expect(screen.getAllByRole("link", { name: /dashboard/i }).length).toBeGreaterThan(0);
  });

  it("shows a form-level error for invalid credentials (401)", async () => {
    renderApp("/login");
    await fillCredentials("patient@aurora.test", "wrong-password");

    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid email or password/i);
  });

  it("maps a 422 validation error onto the email field", async () => {
    server.use(scenarios.loginValidationError());
    renderApp("/login");
    await fillCredentials("patient@aurora.test", "password123");

    expect(await screen.findByText(/not a valid email address/i)).toBeInTheDocument();
  });

  it("shows a generic error when the network fails", async () => {
    server.use(scenarios.loginNetworkError());
    renderApp("/login");
    await fillCredentials("patient@aurora.test", "password123");

    expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
  });
});

describe("route authorization", () => {
  it("keeps a patient out of the admin area", async () => {
    await loginAs("patient@aurora.test");
    renderApp("/admin");

    // Redirected to the dashboard instead of the admin page.
    expect(await screen.findByText(/welcome, pat/i)).toBeInTheDocument();
    expect(screen.queryAllByRole("link", { name: /admin/i })).toHaveLength(0);
  });

  it("lets an admin reach the admin area", async () => {
    await loginAs("admin@aurora.test");
    renderApp("/admin");

    expect(await screen.findByText(/arriving in milestone/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /admin/i }).length).toBeGreaterThan(0);
  });
});
