import { expect, test, type Page } from "@playwright/test";

import {
  clinicFilter,
  dayHeadings,
  expectRows,
  expectTabsRows,
  openList,
  openTab,
  rows,
  tabs,
} from "./qaList";

/**
 * AURORA-8 AC11 (clinic filter) and AC13 (Load more).
 *
 * appointmentsTwoClinics at now 2026-10-09T17:00Z, rows by the AC1-AC4 rules:
 *   Aurora Downtown:  31 Oct 12 CONFIRMED (Upcoming), 32 Oct 7 COMPLETED (Past),
 *                     33 Oct 14 CANCELLED
 *   Aurora Riverside: 34 Oct 13 REQUESTED (Upcoming + Needs action), 35 Oct 15 CONFIRMED (Upcoming),
 *                     36 Oct 6 NO_SHOW (Past), 37 Oct 8 CONFIRMED started (Needs action + Past),
 *                     38 Oct 16 CANCELLED, 39 Oct 2 CANCELLED
 * Clinic ids are the seeded ids of the two clinics (input data).
 */

const OCTOBER_NOW = "2026-10-09T17:00:00Z";
const DOWNTOWN_ID = "c1111111-1111-4111-8111-000000000001";
const RIVERSIDE_ID = "c2222222-2222-4222-8222-000000000002";

function clinicParam(page: Page): string | null {
  return new URL(page.url()).searchParams.get("clinic");
}

async function expectClinicCells(page: Page, clinic: string): Promise<void> {
  const count = await rows(page).count();
  for (let i = 0; i < count; i++) {
    await expect(rows(page).nth(i).getByRole("cell").nth(1)).toHaveText(clinic);
  }
}

test.describe("AURORA-8 clinic filter (AC11)", () => {
  test("AC11 @qa-verify All clinics is the default and every tab holds both clinics' rows", async ({
    page,
  }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: OCTOBER_NOW,
      scenarios: ["appointmentsTwoClinics"],
    });
    await expect(clinicFilter(page)).toBeVisible();
    await expect(clinicFilter(page).locator("option:checked")).toHaveText("All clinics");
    await expect(tabs(page)).toHaveText([
      "Upcoming (3)",
      "Needs action (2)",
      "Past (3)",
      "Cancelled (3)",
    ]);
    await expectTabsRows(page, {
      Upcoming: [31, 34, 35],
      "Needs action": [37, 34],
      Past: [37, 32, 36],
      Cancelled: [38, 33, 39],
    });
  });

  test("AC11 @qa-verify choosing Aurora Downtown limits every tab, the counts follow and the URL has ?clinic=<id>", async ({
    page,
  }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: OCTOBER_NOW,
      scenarios: ["appointmentsTwoClinics"],
    });
    await clinicFilter(page).selectOption({ label: "Aurora Downtown" });
    await expect.poll(() => clinicParam(page)).toBe(DOWNTOWN_ID);
    await expect(tabs(page)).toHaveText([
      "Upcoming (1)",
      "Needs action (0)",
      "Past (1)",
      "Cancelled (1)",
    ]);
    const expected: Record<string, number[]> = {
      Upcoming: [31],
      "Needs action": [],
      Past: [32],
      Cancelled: [33],
    };
    for (const [label, numbers] of Object.entries(expected)) {
      await openTab(page, label);
      await expectRows(page, numbers);
      await expectClinicCells(page, "Aurora Downtown");
    }
  });

  test("AC11 @qa-verify the chosen clinic stays after a reload, and All clinics brings every row back", async ({
    page,
  }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: OCTOBER_NOW,
      scenarios: ["appointmentsTwoClinics"],
    });
    await clinicFilter(page).selectOption({ label: "Aurora Downtown" });
    await expect.poll(() => clinicParam(page)).toBe(DOWNTOWN_ID);
    await page.reload();
    await expect(clinicFilter(page).locator("option:checked")).toHaveText("Aurora Downtown");
    await expect(tabs(page)).toHaveText([
      "Upcoming (1)",
      "Needs action (0)",
      "Past (1)",
      "Cancelled (1)",
    ]);
    await expectRows(page, [31]);

    await clinicFilter(page).selectOption({ label: "All clinics" });
    await expect.poll(() => clinicParam(page)).toBeNull();
    await expect(tabs(page)).toHaveText([
      "Upcoming (3)",
      "Needs action (2)",
      "Past (3)",
      "Cancelled (3)",
    ]);
    await expectRows(page, [31, 34, 35]);
  });

  test("AC11 AC6 @qa-verify a link with ?clinic=<Riverside>&tab=needs-action opens that tab filtered to Riverside", async ({
    page,
  }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: OCTOBER_NOW,
      scenarios: ["appointmentsTwoClinics"],
      search: `?clinic=${RIVERSIDE_ID}&tab=needs-action`,
    });
    await expect(clinicFilter(page).locator("option:checked")).toHaveText("Aurora Riverside");
    await expect(tabs(page)).toHaveText([
      "Upcoming (2)",
      "Needs action (2)",
      "Past (2)",
      "Cancelled (2)",
    ]);
    await expectRows(page, [37, 34]);
    await expectClinicCells(page, "Aurora Riverside");
  });

  test("AC11 AC6 @qa-verify changing the clinic keeps the open tab in the URL", async ({
    page,
  }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: OCTOBER_NOW,
      scenarios: ["appointmentsTwoClinics"],
      search: "?tab=cancelled",
    });
    await clinicFilter(page).selectOption({ label: "Aurora Riverside" });
    await expect.poll(() => clinicParam(page)).toBe(RIVERSIDE_ID);
    await expect(page).toHaveURL(/[?&]tab=cancelled(&|$)/);
    await expectRows(page, [38, 39]);
  });

  test("AC11 @qa-verify a patient's tab counts follow the clinic filter", async ({ page }) => {
    await openList(page, {
      role: "PATIENT",
      now: OCTOBER_NOW,
      scenarios: ["appointmentsTwoClinics"],
    });
    await expect(tabs(page)).toHaveText(["Upcoming (3)", "Past (3)", "Cancelled (3)"]);
    await clinicFilter(page).selectOption({ label: "Aurora Riverside" });
    await expect(tabs(page)).toHaveText(["Upcoming (2)", "Past (2)", "Cancelled (2)"]);
    await expectRows(page, [34, 35]);
  });

  test("AC11 @qa-verify a clinic on the second page of clinics (55th of 60) can be chosen", async ({
    page,
  }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: OCTOBER_NOW,
      scenarios: ["appointmentsTwoClinics", "clinicsManyPages"],
    });
    // "All clinics" plus all 60 clinics.
    await expect(clinicFilter(page).getByRole("option")).toHaveCount(61);
    await clinicFilter(page).selectOption({ label: "Aurora Riverside" });
    await expect.poll(() => clinicParam(page)).toBe(RIVERSIDE_ID);
    await expect(tabs(page)).toHaveText([
      "Upcoming (2)",
      "Needs action (2)",
      "Past (2)",
      "Cancelled (2)",
    ]);
    await expectRows(page, [34, 35]);
  });
});

/**
 * appointmentsManyPages at now 2026-10-09T17:00Z: 150 rows at Aurora Downtown, row number 100 + i,
 * i = 0..149, starting 2026-10-20 18:00Z minus i days, served newest first in pages of the
 * requested limit. Rows i = 0..11 have not started (CONFIRMED when i is even, REQUESTED when odd);
 * rows i = 12..149 have started and cycle on i % 4: COMPLETED, NO_SHOW, CANCELLED, CONFIRMED.
 * By the AC rules (the app asks for 100 per page):
 *   first page (i 0..99):   Upcoming 12, Needs action 6 + 22 = 28, Past 22 + 22 + 22 = 66, Cancelled 22
 *   all rows (i 0..149):    Upcoming 12, Needs action 6 + 34 = 40, Past 35 + 35 + 34 = 104, Cancelled 34
 */
function laDay(i: number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(2026, 9, 20 - i, 18)));
}

test.describe("AURORA-8 Load more (AC13)", () => {
  test("AC13 @qa-verify Load more adds the older appointments to the right tabs and the counts grow", async ({
    page,
  }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: OCTOBER_NOW,
      scenarios: ["appointmentsManyPages"],
    });
    await expect(tabs(page)).toHaveText([
      "Upcoming (12)",
      "Needs action (28)",
      "Past (66)",
      "Cancelled (22)",
    ]);
    const loadMore = page.getByRole("button", { name: "Load more" });
    await expect(loadMore).toBeVisible();
    await openTab(page, "Past");
    await expect(rows(page)).toHaveCount(66);

    await loadMore.click();
    await expect(tabs(page)).toHaveText([
      "Upcoming (12)",
      "Needs action (40)",
      "Past (104)",
      "Cancelled (34)",
    ]);
    // Still on Past; the oldest row (i = 149, NO_SHOW) is now last, newest first.
    await expect(tabs(page).nth(2)).toHaveAttribute("aria-selected", "true");
    await expect(rows(page)).toHaveCount(104);
    await expect(rows(page).last().getByRole("link")).toHaveAttribute(
      "href",
      /\/appointments\/88888888-8888-4888-8888-000000000249$/,
    );
    await expect(dayHeadings(page).last()).toHaveText(laDay(149));
    // All 150 rows are loaded, so no further page.
    await expect(loadMore).toHaveCount(0);

    // Needs action is soonest first: the oldest started CONFIRMED row (i = 147) now leads.
    await openTab(page, "Needs action");
    await expect(rows(page)).toHaveCount(40);
    await expect(rows(page).first().getByRole("link")).toHaveAttribute(
      "href",
      /\/appointments\/88888888-8888-4888-8888-000000000247$/,
    );
    // Cancelled is newest first: the oldest CANCELLED row (i = 146) is last.
    await openTab(page, "Cancelled");
    await expect(rows(page)).toHaveCount(34);
    await expect(rows(page).last().getByRole("link")).toHaveAttribute(
      "href",
      /\/appointments\/88888888-8888-4888-8888-000000000246$/,
    );
    // Upcoming did not change: rows i = 11 .. 0, soonest first.
    await openTab(page, "Upcoming");
    await expectRows(
      page,
      Array.from({ length: 12 }, (_, k) => 111 - k),
    );
  });
});
