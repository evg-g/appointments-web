import { expect, test } from "@playwright/test";

import { AppNav, AppointmentPage, BookingWizardPage } from "../../../models";
import { BOOKABLE_DAY, seedSession } from "../../../support/helpers";
import {
  dayGroup,
  dayHeadings,
  expectRows,
  openList,
  openTab,
  panel,
  rowId,
  rows,
  tab,
} from "./qaList";

/**
 * AURORA-8 AC9 (day headings in the clinic's zone) and AC10 (row content). Both seeded clinics are
 * in America/Los_Angeles; the browser runs in UTC (playwright.config.ts), so a heading judged in
 * the browser's zone instead of the clinic's would differ in the zone tests below.
 * Expected headings follow the AC9 format: "Today · Tue, Oct 6", "Tomorrow · Wed, Oct 7",
 * "Thu, Oct 8", and the year when it is not the current year ("Tue, Jan 5, 2027").
 */

test.describe("AURORA-8 day headings (AC9)", () => {
  test("AC9 @qa-verify plain day headings, and the year only for a day outside the current year", async ({
    page,
  }) => {
    // appointmentsEveryStatus, now Sun 2026-01-04 10:00 PST.
    await openList(page, {
      role: "CLINICIAN",
      now: "2026-01-04T18:00:00Z",
      scenarios: ["appointmentsEveryStatus"],
    });
    await expect(dayHeadings(page)).toHaveText(["Tue, Jan 6", "Wed, Jan 7"]);
    await openTab(page, "Past");
    await expect(dayHeadings(page)).toHaveText(["Sat, Jan 3", "Fri, Jan 2", "Tue, Dec 30, 2025"]);
    const dec30 = dayGroup(page, "Tue, Dec 30, 2025");
    await expect(dec30.getByRole("link")).toHaveCount(1);
    await expect(dec30.getByRole("link")).toHaveAttribute("href", `/appointments/${rowId(5)}`);
  });

  test("AC9 @qa-verify the year shows for next year's days and not for this year's (now 2025-12-31)", async ({
    page,
  }) => {
    // Now Wed 2025-12-31 12:00 PST. Rows 3, 1, 2 have not started (Upcoming); row 4 COMPLETED
    // (Jan 2, 2026) and row 5 NO_SHOW (Dec 30, 2025) are Past.
    await openList(page, {
      role: "CLINICIAN",
      now: "2025-12-31T20:00:00Z",
      scenarios: ["appointmentsEveryStatus"],
    });
    await expect(dayHeadings(page)).toHaveText([
      "Sat, Jan 3, 2026",
      "Tue, Jan 6, 2026",
      "Wed, Jan 7, 2026",
    ]);
    await openTab(page, "Past");
    await expect(dayHeadings(page)).toHaveText(["Fri, Jan 2, 2026", "Tue, Dec 30"]);
  });

  test('AC9 @qa-verify an appointment later today is under "Today · Mon, Oct 12"', async ({
    page,
  }) => {
    // appointmentsNoCancelled: row 11 Mon Oct 12 10:00 PDT (CONFIRMED), row 12 Tue Nov 3 (REQUESTED).
    // Now Mon Oct 12 08:00 PDT.
    await openList(page, {
      role: "CLINICIAN",
      now: "2026-10-12T15:00:00Z",
      scenarios: ["appointmentsNoCancelled"],
    });
    await expect(dayHeadings(page)).toHaveText(["Today · Mon, Oct 12", "Tue, Nov 3"]);
    await expect(dayGroup(page, "Today · Mon, Oct 12").getByRole("link")).toHaveAttribute(
      "href",
      `/appointments/${rowId(11)}`,
    );
  });

  test('AC9 @qa-verify an appointment the next day is under "Tomorrow · Mon, Oct 12"', async ({
    page,
  }) => {
    // Now Sun Oct 11 10:00 PDT.
    await openList(page, {
      role: "CLINICIAN",
      now: "2026-10-11T17:00:00Z",
      scenarios: ["appointmentsNoCancelled"],
    });
    await expect(dayHeadings(page)).toHaveText(["Tomorrow · Mon, Oct 12", "Tue, Nov 3"]);
  });

  test("AC9 @qa-verify Today and Tomorrow are judged in the clinic's zone, not the browser's (UTC)", async ({
    page,
  }) => {
    // Now 2026-10-12 03:00 UTC = Sun Oct 11 20:00 PDT. In the clinic's zone row 11 (Mon Oct 12)
    // is tomorrow; in UTC it would be today.
    await openList(page, {
      role: "CLINICIAN",
      now: "2026-10-12T03:00:00Z",
      scenarios: ["appointmentsNoCancelled"],
    });
    await expect(dayHeadings(page)).toHaveText(["Tomorrow · Mon, Oct 12", "Tue, Nov 3"]);
    await expect(panel(page).getByRole("heading", { name: /^Today/ })).toHaveCount(0);
  });

  test("AC9 @qa-verify a late-evening booking is grouped under its day in the clinic's zone, not the UTC day", async ({
    page,
  }) => {
    // Book the last slot of Mon 2026-01-05 at Aurora Downtown (clinic hours 9-5 in Los Angeles):
    // it starts after 16:00 PST, which is already Tue Jan 6 in UTC (the browser's zone).
    // Now is Mon Jan 5 07:00 PST, so the booking is today in the clinic's zone.
    await page.clock.setFixedTime(new Date("2026-01-05T15:00:00Z"));
    await seedSession(page, "PATIENT");
    const wizard = new BookingWizardPage(page);
    await wizard.goto();
    await wizard.openTimeStep({ day: BOOKABLE_DAY });
    const last = (await wizard.slots.last().innerText()).trim();
    // Premise: the slot is late afternoon (4 PM or later), i.e. on the next UTC day.
    expect(last).toMatch(/^0?(4|5):\d{2}\sPM/);
    await wizard.pickSlot(last);
    await wizard.confirm();
    await new AppointmentPage(page).expectLoaded();
    await new AppNav(page).openAppointments();
    await expect(page.getByRole("heading", { level: 1, name: "Appointments" })).toBeVisible();
    await expect(tab(page, "Upcoming")).toHaveAttribute("aria-selected", "true");
    await expect(dayHeadings(page)).toHaveText(["Today · Mon, Jan 5"]);
    // AC10 format "10:00 AM PDT"; user answer 3: times keep the leading zero ("09:30 AM PST").
    const [h = "", rest = ""] = last.split(":");
    await expect(dayGroup(page, "Today · Mon, Jan 5").getByRole("link")).toHaveText(
      `${h.padStart(2, "0")}:${rest} PST`,
    );
    await expect(panel(page).getByRole("heading", { name: /Jan 6/ })).toHaveCount(0);
  });
});

test.describe("AURORA-8 row content (AC10)", () => {
  test('AC10 @qa-verify a 10:00 Los Angeles row in October reads "10:00 AM PDT", shows clinic and status, and links to the appointment', async ({
    page,
  }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: "2026-10-09T17:00:00Z",
      scenarios: ["appointmentsNoCancelled"],
    });
    await expectRows(page, [11, 12]);
    const row = rows(page).first();
    await expect(row.getByRole("link")).toHaveText("10:00 AM PDT");
    await expect(row.getByRole("link")).toHaveAttribute("href", `/appointments/${rowId(11)}`);
    await expect(row.getByRole("cell").nth(1)).toHaveText("Aurora Downtown");
    await expect(row.getByRole("cell").nth(2)).toHaveText(/^Confirmed$/i);
    await row.getByRole("link").click();
    await expect(page).toHaveURL(new RegExp(`/appointments/${rowId(11)}$`));
  });

  test("AC10 @qa-verify a November row shows the PST zone and its own status", async ({ page }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: "2026-10-09T17:00:00Z",
      scenarios: ["appointmentsNoCancelled"],
    });
    await expectRows(page, [11, 12]);
    const row = rows(page).nth(1);
    // Row 12: 2026-11-03T17:30Z = 09:30 AM PST (user answer 3: the leading zero stays).
    await expect(row.getByRole("link")).toHaveText("09:30 AM PST");
    await expect(row.getByRole("cell").nth(2)).toHaveText(/^Requested$/i);
  });

  test("AC10 @qa-verify a row at the second clinic shows that clinic's name", async ({ page }) => {
    // appointmentsTwoClinics: row 34 at Aurora Riverside, 2026-10-13T16:00Z = 9:00 AM PDT, REQUESTED.
    await openList(page, {
      role: "CLINICIAN",
      now: "2026-10-09T17:00:00Z",
      scenarios: ["appointmentsTwoClinics"],
    });
    await expectRows(page, [31, 34, 35]);
    const row = rows(page).nth(1);
    await expect(row.getByRole("link")).toHaveText("09:00 AM PDT");
    await expect(row.getByRole("cell").nth(1)).toHaveText("Aurora Riverside");
    await expect(row.getByRole("cell").nth(2)).toHaveText(/^Requested$/i);
  });
});
