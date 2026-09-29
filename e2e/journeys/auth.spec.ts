import { test, expect } from "@playwright/test";

import { ACCOUNTS, loginViaForm, seedSession } from "../support/helpers";

test.describe("authentication", () => {
  test("signs in with valid credentials and reaches the dashboard", async ({ page }) => {
    await loginViaForm(page, "PATIENT");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1, name: /Welcome, Pat/ })).toBeVisible();
  });

  test("rejects invalid credentials and stays on the login page", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ACCOUNTS.PATIENT.email);
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("sends an unauthenticated visitor to the login page", async ({ page }) => {
    await page.goto("/cold-chain");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });
});

test.describe("authorization", () => {
  test("keeps a patient out of the admin area", async ({ page }) => {
    await seedSession(page, "PATIENT");
    await page.goto("/admin/clinics");
    // RequireRole redirects a disallowed role back to the dashboard.
    await expect(page.getByRole("heading", { level: 1, name: /Welcome, Pat/ })).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test("keeps a patient out of the cold-chain dashboard", async ({ page }) => {
    await seedSession(page, "PATIENT");
    await page.goto("/cold-chain");
    await expect(page.getByRole("heading", { level: 1, name: /Welcome, Pat/ })).toBeVisible();
  });

  test("lets an admin reach the admin area", async ({ page }) => {
    await seedSession(page, "PLATFORM_ADMIN");
    await page.goto("/admin/clinics");
    await expect(page.getByRole("heading", { level: 1, name: "Admin" })).toBeVisible();
  });
});
