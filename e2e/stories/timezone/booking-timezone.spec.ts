import type { BookingWizardPage } from "../../models";
import { BOOKABLE_DAY, seedSession } from "../../support/helpers";
import { expect, test } from "../../support/fixtures";

// Booking from a time zone far from the clinic's (docs/tickets/BOOKING-TIMEZONE.md in the aurora
// repo). A viewer in Israel picked 12:20 and got 02:20 on Confirm, and a second booking after
// opening the first one failed with "Something went wrong". The rest of the suite runs in UTC,
// where both bugs hid. Data: the seeded Aurora Downtown clinic (America/Los_Angeles) and its
// General practice clinician; BOOKABLE_DAY is a Monday in January, so the clinic is on PST.

test.use({ timezoneId: "Asia/Jerusalem", locale: "en-US" });

/** Pick `time` on the Time step and check Confirm shows it with the clinic's zone. */
async function pickAndCheck(wizard: BookingWizardPage, time: string): Promise<void> {
  await wizard.pickSlot(time);
  await expect(wizard.when).toContainText(new RegExp(`${time}–\\d{2}:\\d{2} [AP]M PST`));
}

test.describe("booking from another time zone", () => {
  test.beforeEach(async ({ page, dashboard }) => {
    await seedSession(page, "PATIENT");
    await dashboard.goto();
  });

  test("the picked time is the time everywhere, labelled with the clinic's zone", async ({
    nav,
    appointmentsList,
    bookingWizard,
    appointmentPage,
  }) => {
    await test.step("The Time step shows the clinic's hours and names its zone", async () => {
      await nav.openAppointments();
      await appointmentsList.startBooking();
      await bookingWizard.openTimeStep({ day: BOOKABLE_DAY });
      await expect(bookingWizard.timeZoneCaption).toHaveText(
        "Times are in the clinic's time zone (PST).",
      );
      // 09:00 in Los Angeles, not 09:00 for the viewer in Israel (19:00 in Los Angeles).
      await expect(bookingWizard.slots.first()).toHaveText("09:00 AM");
    });

    await test.step("Pick 12:20 PM: Confirm and the appointment page show 12:20 PM PST", async () => {
      await pickAndCheck(bookingWizard, "12:20 PM");
      await bookingWizard.confirm();
      await appointmentPage.expectLoaded();
      await expect(bookingWizard.bookingError).toHaveCount(0);
      await expect(appointmentPage.text(/12:20 PM–12:50 PM\s*PST/)).toBeVisible();
    });

    await test.step("The appointments list shows the same time and zone", async () => {
      await appointmentPage.allAppointmentsLink.click();
      await expect(appointmentsList.appointment("Jan 5, 2026, 12:20 PM PST")).toBeVisible();
    });
  });

  test("more bookings in one session work after opening an appointment", async ({
    nav,
    appointmentsList,
    bookingWizard,
    appointmentPage,
  }) => {
    /** From any page: open the wizard through the menu and reach the Time step. */
    const openTimeStep = async () => {
      await nav.openAppointments();
      await appointmentsList.startBooking();
      await bookingWizard.openTimeStep({ day: BOOKABLE_DAY });
    };
    const book = async (time: string) => {
      await pickAndCheck(bookingWizard, time);
      await bookingWizard.confirm();
      await appointmentPage.expectLoaded();
      await expect(bookingWizard.bookingError).toHaveCount(0);
    };

    await test.step("First booking, then its appointment page is open", async () => {
      await openTimeStep();
      await book("12:20 PM");
    });

    await test.step("The booked slot is no longer offered", async () => {
      await openTimeStep();
      await expect(bookingWizard.slot("12:20 PM")).toHaveCount(0);
    });

    await test.step("A second booking succeeds", async () => {
      await book("09:00 AM");
    });

    await test.step("A third booking succeeds", async () => {
      await openTimeStep();
      await book("01:00 PM");
    });
  });
});
