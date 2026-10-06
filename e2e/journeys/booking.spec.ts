import {
  bookAppointment,
  bookableDay,
  seedSession,
  useScenario,
  walkBookingToConfirm,
} from "../support/helpers";
import { expect, test } from "../support/fixtures";

test.describe("booking", () => {
  test("books an appointment and lands on its detail page", async ({ page, appointmentPage }) => {
    await seedSession(page, "PATIENT");
    const detailPath = await bookAppointment(page);

    expect(detailPath).toMatch(/\/appointments\/[^/]+$/);
    await expect(appointmentPage.status("Requested")).toBeVisible();
  });

  test("surfaces a slot conflict and keeps the user on the confirm step", async ({
    page,
    bookingWizard,
  }) => {
    await seedSession(page, "PATIENT");
    await walkBookingToConfirm(page);

    // Force the API to reject the slot as just-taken by another patient (409).
    await useScenario(page, "bookingConflict");
    await bookingWizard.confirm();

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
    bookingWizard,
    appointmentPage,
  }) => {
    await seedSession(page, "PATIENT");
    await bookingWizard.goto();
    await bookingWizard.openTimeStep({ day: bookableDay() });

    // No fixed clock time here: this journey also runs against the real API (composed stack),
    // whose seed clinic and hours differ from the MSW seed. The exact 09:00 check is in
    // e2e/stories/timezone/, which runs on the MSW seed only.
    await expect(bookingWizard.timeZoneCaption).toBeVisible();
    const picked = await bookingWizard.pickSlot();
    expect(picked).toMatch(/^\d{2}:\d{2} [AP]M$/);
    await expect(bookingWizard.when).toContainText(new RegExp(`${picked}\\s*–`));

    await bookingWizard.confirm();
    await appointmentPage.expectLoaded();
    await expect(appointmentPage.text(new RegExp(`${picked}\\s*–`))).toBeVisible();
  });
});
