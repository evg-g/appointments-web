import { expect, test } from "../support/fixtures";

/**
 * The live demo, from a viewer in Israel (docs/tickets/BOOKING-TIMEZONE.md in the aurora repo).
 * The demo dataset lives on the real clock, so the clock is fixed here: Monday 2026-10-05 at 10:00
 * in Los Angeles, where the demo clinics are. Runs against the Pages build
 * (playwright.pages.config.ts).
 */
const BASE = "/appointments-web/";
const NOW = new Date("2026-10-05T17:00:00Z"); // 10:00 PDT, 20:00 in Israel
const TODAY = "2026-10-05";

test.use({ timezoneId: "Asia/Jerusalem", locale: "en-US" });

/** "09:40 AM" -> minutes after midnight. */
function minutes(label: string): number {
  const match = /^(\d{2}):(\d{2}) ([AP])M$/.exec(label.trim());
  if (match === null) throw new Error(`not a slot time: ${label}`);
  const [, hh = "0", mm = "0", half] = match;
  return ((Number(hh) % 12) + (half === "P" ? 12 : 0)) * 60 + Number(mm);
}

test("the demo offers only slots that have not started, in the clinic's zone", async ({
  page,
  loginPage,
  dashboard,
  nav,
  appointmentsList,
  bookingWizard,
  appointmentPage,
}) => {
  await page.clock.setFixedTime(NOW);

  await test.step("Sign in to the demo", async () => {
    await loginPage.goto(BASE);
    await loginPage.signIn("admin@aurora.test", "password123");
    await dashboard.expectLoaded();
  });

  await test.step("The dashboard labels appointment times with the clinic's zone", async () => {
    await expect(page.getByText(/\w{3} \d+, 2026, \d{2}:\d{2} [AP]M PDT/).first()).toBeVisible();
  });

  await test.step("Today's open slots all start at or after 10:00 AM PDT", async () => {
    await nav.openAppointments();
    await appointmentsList.startBooking();
    await bookingWizard.openTimeStep({ day: TODAY });
    await expect(bookingWizard.timeZoneCaption).toHaveText(
      "Times are in the clinic's time zone (PDT).",
    );

    const times = await bookingWizard.slots.allInnerTexts();
    expect(times.length).toBeGreaterThan(0);
    for (const time of times) expect(minutes(time), time).toBeGreaterThanOrEqual(10 * 60);
  });

  await test.step("A slot later today books, and Confirm shows its PDT time", async () => {
    const picked = await bookingWizard.pickSlot();
    await expect(bookingWizard.when).toContainText(new RegExp(`${picked}–\\d{2}:\\d{2} [AP]M PDT`));
    await bookingWizard.confirm();
    await appointmentPage.expectLoaded();
  });
});
