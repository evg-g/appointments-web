import { expect, test, type Page } from "@playwright/test";

import { BOOKABLE_DAY, seedSession } from "../../support/helpers";

// Booking from a time zone far from the clinic's (docs/tickets/BOOKING-TIMEZONE.md in the aurora
// repo). A viewer in Israel picked 12:20 and got 02:20 on Confirm, and a second booking after
// opening the first one failed with "Something went wrong". The rest of the suite runs in UTC,
// where both bugs hid. Data: the seeded Aurora Downtown clinic (America/Los_Angeles) and its
// General practice clinician; BOOKABLE_DAY is a Monday in January, so the clinic is on PST.

test.use({ timezoneId: "Asia/Jerusalem", locale: "en-US" });

/** Walk the wizard to the Time step for BOOKABLE_DAY. */
async function openTimeStep(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Appointments" }).first().click();
  await page.getByRole("link", { name: /book/i }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Book an appointment" })).toBeVisible();
  await page.getByLabel("Clinic").selectOption({ label: "Aurora Downtown" });
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Service").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Clinician").selectOption({ label: "General practice" });
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Day").fill(BOOKABLE_DAY);
  await expect(page.getByRole("option").first()).toBeVisible();
}

const slot = (page: Page, time: string) => page.getByRole("option", { name: time, exact: true });

/** Pick `time`, check Confirm shows it, book, and land on the new appointment's page. */
async function book(page: Page, time: string): Promise<void> {
  await slot(page, time).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText(new RegExp(`${time}–\\d{2}:\\d{2} [AP]M PST`))).toBeVisible();
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Appointment" })).toBeVisible();
  await expect(page.getByText("Could not book")).toHaveCount(0);
}

test.describe("booking from another time zone", () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, "PATIENT");
    await page.goto("/");
  });

  test("the picked time is the time everywhere, labelled with the clinic's zone", async ({
    page,
  }) => {
    await test.step("The Time step shows the clinic's hours and names its zone", async () => {
      await openTimeStep(page);
      await expect(page.getByText("Times are in the clinic's time zone (PST).")).toBeVisible();
      // 09:00 in Los Angeles, not 09:00 for the viewer in Israel (19:00 in Los Angeles).
      await expect(page.getByRole("option").first()).toHaveText("09:00 AM");
    });

    await test.step("Pick 12:20 PM: Confirm and the appointment page show 12:20 PM PST", async () => {
      await book(page, "12:20 PM");
      await expect(page.getByText(/12:20 PM–12:50 PM\s*PST/)).toBeVisible();
    });

    await test.step("The appointments list shows the same time and zone", async () => {
      await page.getByRole("link", { name: /all appointments/i }).click();
      await expect(page.getByRole("link", { name: "Jan 5, 2026, 12:20 PM PST" })).toBeVisible();
    });
  });

  test("more bookings in one session work after opening an appointment", async ({ page }) => {
    await test.step("First booking, then its appointment page is open", async () => {
      await openTimeStep(page);
      await book(page, "12:20 PM");
    });

    await test.step("The booked slot is no longer offered", async () => {
      await openTimeStep(page);
      await expect(slot(page, "12:20 PM")).toHaveCount(0);
    });

    await test.step("A second booking succeeds", async () => {
      await book(page, "09:00 AM");
    });

    await test.step("A third booking succeeds", async () => {
      await openTimeStep(page);
      await book(page, "01:00 PM");
    });
  });
});
