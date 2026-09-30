import { test, expect, type Page } from "@playwright/test";

import { seedSession } from "../support/helpers";

/** Showcase screenshots (see playwright.showcase.config.ts). Each test writes one PNG. */

const OUT = "docs/screenshots";

async function shot(page: Page, name: string): Promise<void> {
  // Let fonts and the chart settle. Not "networkidle": the cold-chain page holds a live stream open.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

test("dashboard", async ({ page }) => {
  await seedSession(page, "PLATFORM_ADMIN");
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /Welcome,/ })).toBeVisible();
  await expect(page.getByText(/No upcoming appointments/i)).toBeHidden();
  await expect(page.getByText("1 open excursion")).toBeVisible();
  await shot(page, "dashboard");
});

test("appointments", async ({ page }) => {
  await seedSession(page, "PATIENT");
  await page.goto("/appointments");
  await expect(page.getByRole("heading", { level: 1, name: "Appointments" })).toBeVisible();
  await expect(page.getByText("Confirmed").first()).toBeVisible();
  await shot(page, "appointments");
});

test("booking — pick a time", async ({ page }) => {
  await seedSession(page, "PATIENT");
  await page.goto("/appointments/new");
  await page.getByLabel("Clinic").selectOption({ label: "Aurora Downtown" });
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Service").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Clinician").selectOption({ label: "General practice" });
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Day").fill(nextMonday());
  await page.getByRole("option").nth(2).click();
  await shot(page, "booking");
});

test("cold chain", async ({ page }) => {
  await seedSession(page, "CLINICIAN");
  await page.goto("/cold-chain");
  await expect(page.getByRole("img", { name: /temperature for/i })).toBeVisible();
  await shot(page, "cold-chain");
});

test("admin audit log", async ({ page }) => {
  await seedSession(page, "PLATFORM_ADMIN");
  await page.goto("/admin/audit");
  await expect(page.getByText("appointment.confirmed").first()).toBeVisible();
  await expect(page.getByText("Aurora Northside")).toBeVisible();
  await shot(page, "admin");
});

test.describe("dark", () => {
  test.use({ colorScheme: "dark" });

  test("cold chain (dark)", async ({ page }) => {
    await seedSession(page, "CLINICIAN");
    await page.goto("/cold-chain");
    await expect(page.getByRole("img", { name: /temperature for/i })).toBeVisible();
    await shot(page, "cold-chain-dark");
  });
});

function nextMonday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return d.toISOString().slice(0, 10);
}
