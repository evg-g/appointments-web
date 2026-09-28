import { test, expect, type Page } from "@playwright/test";

import { seedSession } from "../support/helpers";

/**
 * Visual regression on the key pages, light + dark. Determinism: the clock is frozen (so the
 * seeded relative timestamps render identically every run), motion is reduced, and the browser
 * locale/timezone are pinned in playwright.config.ts. Baselines are Chromium-on-Linux and are
 * committed; regenerate with `npm run e2e:update-snapshots`.
 *
 * The cold-chain dashboard is deliberately not snapshotted: its chart is stream/time-driven, so a
 * pixel baseline would be flaky by construction — the "zero flakiness" rule. It is covered by the
 * a11y sweep, the component tests, and the E2E acknowledge flow instead.
 */

const FIXED = new Date("2026-03-16T09:30:00Z");
const THEMES = ["light", "dark"] as const;

async function freezeClock(page: Page): Promise<void> {
  await page.clock.install({ time: FIXED });
}

for (const theme of THEMES) {
  test.describe(`visual — ${theme}`, () => {
    test.use({ colorScheme: theme, reducedMotion: "reduce" });

    test("login", async ({ page }) => {
      await freezeClock(page);
      await page.goto("/login");
      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
      await expect(page).toHaveScreenshot(`login-${theme}.png`, { fullPage: true });
    });

    test("dashboard", async ({ page }) => {
      await freezeClock(page);
      await seedSession(page, "PLATFORM_ADMIN");
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1, name: /Welcome,/ })).toBeVisible();
      await expect(page.getByText(/No upcoming appointments/i)).toBeVisible();
      await expect(page).toHaveScreenshot(`dashboard-${theme}.png`, { fullPage: true });
    });

    test("appointments empty state", async ({ page }) => {
      await freezeClock(page);
      await seedSession(page, "PATIENT");
      await page.goto("/appointments");
      await expect(page.getByText(/no appointments yet/i)).toBeVisible();
      await expect(page).toHaveScreenshot(`appointments-empty-${theme}.png`, { fullPage: true });
    });

    test("booking wizard", async ({ page }) => {
      await freezeClock(page);
      await seedSession(page, "PATIENT");
      await page.goto("/appointments/new");
      await expect(
        page.getByRole("heading", { level: 1, name: "Book an appointment" }),
      ).toBeVisible();
      await expect(page.getByLabel("Clinic")).toBeVisible();
      await expect(page).toHaveScreenshot(`booking-${theme}.png`, { fullPage: true });
    });

    test("admin clinics", async ({ page }) => {
      await freezeClock(page);
      await seedSession(page, "PLATFORM_ADMIN");
      await page.goto("/admin/clinics");
      await expect(page.getByRole("heading", { level: 1, name: "Admin" })).toBeVisible();
      await expect(page.getByText("Aurora Downtown")).toBeVisible();
      await expect(page).toHaveScreenshot(`admin-clinics-${theme}.png`, { fullPage: true });
    });
  });
}
