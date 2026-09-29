import { test, expect } from "@playwright/test";

/**
 * The live demo works as a visitor would use it: open the site, sign in with the demo account, see
 * demo data, and reload a deep link. Runs against the Pages build (playwright.pages.config.ts).
 */
const BASE = "/appointments-web/";

test("a visitor can sign in to the demo and reload a deep link", async ({ page }) => {
  await page.goto(BASE);
  await expect(page).toHaveURL(/\/appointments-web\/login$/);
  await expect(page.getByText(/Live demo/)).toBeVisible();

  await page.getByLabel("Email").fill("admin@aurora.test");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { level: 1, name: /Welcome,/ })).toBeVisible();
  await expect(page.getByText("Confirmed").first()).toBeVisible();

  await page.getByRole("link", { name: "Cold chain" }).first().click();
  await expect(page).toHaveURL(/\/appointments-web\/cold-chain$/);
  await expect(page.getByRole("img", { name: /temperature for/i })).toBeVisible();

  // A reload on a deep link goes through 404.html on Pages; the SPA must still render the page.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Cold chain" })).toBeVisible();
});
