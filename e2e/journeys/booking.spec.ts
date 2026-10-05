import { test, expect } from "@playwright/test";

import {
  bookAppointment,
  bookableDay,
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

// A viewer far from the clinic's zone (the demo clinics are in Los Angeles). The rest of the suite
// runs in UTC, where a slot shown in the browser's zone happened to match, so this bug hid there.
test.describe("booking from another time zone", () => {
  test.use({ timezoneId: "Asia/Jerusalem" });

  test("the picked time is the time on the confirm step and the saved appointment", async ({
    page,
  }) => {
    await seedSession(page, "PATIENT");
    await page.goto("/appointments/new");
    await page.getByLabel("Clinic").selectOption({ label: "Aurora Downtown" });
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByLabel("Service").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByLabel("Clinician").selectOption({ label: "General practice" });
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByLabel("Day").fill(bookableDay());

    const slot = page.getByRole("option").first();
    const picked = (await slot.innerText()).trim();
    expect(picked).toBe("09:00 AM");
    await expect(page.getByText(/clinic's time zone/i)).toBeVisible();

    await slot.click();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText(new RegExp(`${picked}\\s*–`))).toBeVisible();

    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Appointment" })).toBeVisible();
    await expect(page.getByText(new RegExp(`${picked}\\s*–`))).toBeVisible();
  });
});
