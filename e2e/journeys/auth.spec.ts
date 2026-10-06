import { ACCOUNTS, loginViaForm, seedSession } from "../support/helpers";
import { expect, test } from "../support/fixtures";

test.describe("authentication", () => {
  test("signs in with valid credentials and reaches the dashboard", async ({ page, dashboard }) => {
    await loginViaForm(page, "PATIENT");
    await expect(page).toHaveURL(/\/$/);
    await expect(dashboard.welcome("Pat")).toBeVisible();
  });

  test("rejects invalid credentials and stays on the login page", async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.signIn(ACCOUNTS.PATIENT.email, "not-the-password");

    await expect(loginPage.error(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("sends an unauthenticated visitor to the login page", async ({ page, loginPage }) => {
    await page.goto("/cold-chain");
    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.signInButton).toBeVisible();
  });
});

test.describe("authorization", () => {
  test("keeps a patient out of the admin area", async ({ page, dashboard }) => {
    await seedSession(page, "PATIENT");
    await page.goto("/admin/clinics");
    // RequireRole redirects a disallowed role back to the dashboard.
    await expect(dashboard.welcome("Pat")).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test("keeps a patient out of the cold-chain dashboard", async ({ page, dashboard }) => {
    await seedSession(page, "PATIENT");
    await page.goto("/cold-chain");
    await expect(dashboard.welcome("Pat")).toBeVisible();
  });

  test("lets an admin reach the admin area", async ({ page }) => {
    await seedSession(page, "PLATFORM_ADMIN");
    await page.goto("/admin/clinics");
    await expect(page.getByRole("heading", { level: 1, name: "Admin" })).toBeVisible();
  });
});
