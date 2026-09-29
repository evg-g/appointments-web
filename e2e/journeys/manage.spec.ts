import { test, expect } from "@playwright/test";

import { bookAppointment, bootScenario, seedSession } from "../support/helpers";

test.describe("managing an appointment", () => {
  test("transitions a booked appointment through confirm then cancel", async ({ page }) => {
    // Staff manage appointment state; the transition and cancel both go through ETag/If-Match.
    await seedSession(page, "PLATFORM_ADMIN");
    await bookAppointment(page);

    // Reschedule/confirm: REQUESTED -> CONFIRMED via the transition endpoint.
    await page.getByRole("button", { name: "Mark confirmed" }).click();
    await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();

    // Cancel with a reason (a separate endpoint, also If-Match guarded).
    await page.getByRole("button", { name: "Cancel appointment" }).click();
    await page.getByLabel("Reason").fill("patient requested a later time");
    await page.getByRole("button", { name: "Confirm cancellation" }).click();

    await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
    await expect(page.getByText("patient requested a later time")).toBeVisible();
  });
});

test.describe("error and empty states", () => {
  test("shows an error state with retry when the appointment list fails", async ({ page }) => {
    await seedSession(page, "PATIENT");
    await bootScenario(page, "appointmentsError");
    await page.goto("/appointments");

    await expect(page.getByRole("heading", { level: 1, name: "Appointments" })).toBeVisible();
    await expect(page.getByRole("button", { name: /retry|try again/i })).toBeVisible();
  });

  test("shows a designed empty state when there are no appointments", async ({ page }) => {
    await seedSession(page, "PATIENT");
    await bootScenario(page, "appointmentsEmpty");
    await page.goto("/appointments");

    await expect(page.getByText(/no appointments yet/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /book/i }).first()).toBeVisible();
  });
});
