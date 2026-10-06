import { bookAppointment, bootScenario, seedSession } from "../support/helpers";
import { expect, test } from "../support/fixtures";

test.describe("managing an appointment", () => {
  test("transitions a booked appointment through confirm then cancel", async ({
    page,
    appointmentPage,
  }) => {
    // Staff manage appointment state; the transition and cancel both go through ETag/If-Match.
    await seedSession(page, "PLATFORM_ADMIN");
    await bookAppointment(page);

    // Reschedule/confirm: REQUESTED -> CONFIRMED via the transition endpoint.
    await appointmentPage.markConfirmed();
    await expect(appointmentPage.status("Confirmed")).toBeVisible();

    // Cancel with a reason (a separate endpoint, also If-Match guarded).
    await appointmentPage.cancel("patient requested a later time");

    await expect(appointmentPage.status("Cancelled")).toBeVisible();
    await expect(appointmentPage.text("patient requested a later time")).toBeVisible();
  });
});

test.describe("error and empty states", () => {
  test("shows an error state with retry when the appointment list fails", async ({
    page,
    appointmentsList,
  }) => {
    await seedSession(page, "PATIENT");
    await bootScenario(page, "appointmentsError");
    await appointmentsList.goto();

    await expect(appointmentsList.retryButton).toBeVisible();
  });

  test("shows a designed empty state when there are no appointments", async ({
    page,
    appointmentsList,
  }) => {
    await seedSession(page, "PATIENT");
    await bootScenario(page, "appointmentsEmpty");
    await appointmentsList.goto();

    await expect(appointmentsList.emptyState).toBeVisible();
    await expect(appointmentsList.bookLink).toBeVisible();
  });
});
