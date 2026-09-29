import { test, expect } from "@playwright/test";

import {
  bookAppointment,
  seedSession,
  useScenario,
  walkBookingToConfirm,
} from "../support/helpers";

test.describe("booking", () => {
  test("books an appointment and lands on its detail page", async ({ page }) => {
    await seedSession(page, "PATIENT");
    const detailPath = await bookAppointment(page);

    expect(detailPath).toMatch(/\/appointments\/[^/]+$/);
    await expect(page.getByText("Requested", { exact: true })).toBeVisible();
  });

  test("surfaces a slot conflict and keeps the user on the confirm step", async ({ page }) => {
    await seedSession(page, "PATIENT");
    await walkBookingToConfirm(page);

    // Force the API to reject the slot as just-taken by another patient (409).
    await useScenario(page, "bookingConflict");
    await page.getByRole("button", { name: "Confirm booking" }).click();

    await expect(page.getByText(/no longer available/i)).toBeVisible();
    await expect(page).toHaveURL(/\/appointments\/new$/);
  });
});
