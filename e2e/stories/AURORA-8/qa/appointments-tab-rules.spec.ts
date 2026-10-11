import { expect, test } from "@playwright/test";

import { expectRows, expectTabsRows, openList, openTab, panel, tabs } from "./qaList";

/**
 * AURORA-8 AC1-AC4: which appointments each tab holds, and in which order.
 *
 * Input: the `appointmentsEveryStatus` scenario (fixture rows, all at Aurora Downtown, PST dates):
 *   row 1  2026-01-06T17:00Z CONFIRMED
 *   row 2  2026-01-07T18:00Z REQUESTED
 *   row 3  2026-01-03T17:00Z CONFIRMED
 *   row 4  2026-01-02T17:00Z COMPLETED
 *   row 5  2025-12-30T17:00Z NO_SHOW
 *   row 6  2026-01-08T17:00Z CANCELLED
 * "Now" is fixed with page.clock, so each test moves rows across the "started" line on purpose.
 * Every expected list below is derived from the AC text ("started" = start time is now or
 * earlier; AC1/AC2 soonest first, AC3/AC4 newest first), not from the code.
 */

const STAFF = "CLINICIAN" as const;

test.describe("AURORA-8 tab rules", () => {
  test("AC1 AC2 AC3 AC4 @qa-verify each tab holds the AC rows in the AC order (now 2026-01-04 18:00Z)", async ({
    page,
  }) => {
    await openList(page, {
      role: STAFF,
      now: "2026-01-04T18:00:00Z",
      scenarios: ["appointmentsEveryStatus"],
    });
    await expect(tabs(page)).toHaveCount(4);
    await expectTabsRows(page, {
      Upcoming: [1, 2], // REQUESTED/CONFIRMED not started, soonest first
      "Needs action": [3, 2], // CONFIRMED started (Jan 3), REQUESTED not started (Jan 7)
      Past: [3, 4, 5], // CONFIRMED started, COMPLETED, NO_SHOW; newest first
      Cancelled: [6],
    });
  });

  test("AC1 AC2 AC3 @qa-verify boundary: a CONFIRMED row whose start equals now counts as started", async ({
    page,
  }) => {
    // AC: "Started" means the appointment's start time is now or earlier. Row 1 starts at exactly now.
    await openList(page, {
      role: STAFF,
      now: "2026-01-06T17:00:00.000Z",
      scenarios: ["appointmentsEveryStatus"],
    });
    await expectTabsRows(page, {
      Upcoming: [2],
      "Needs action": [3, 1, 2],
      Past: [1, 3, 4, 5],
    });
  });

  test("AC1 AC2 AC3 @qa-verify boundary: one millisecond before its start the CONFIRMED row is still upcoming", async ({
    page,
  }) => {
    await openList(page, {
      role: STAFF,
      now: "2026-01-06T16:59:59.999Z",
      scenarios: ["appointmentsEveryStatus"],
    });
    await expectTabsRows(page, {
      Upcoming: [1, 2],
      "Needs action": [3, 2],
      Past: [3, 4, 5],
    });
  });

  test("AC1 AC2 AC3 @qa-verify a REQUESTED row that has started goes to Past, not Upcoming or Needs action", async ({
    page,
  }) => {
    // Row 2 (REQUESTED) starts at exactly now, so it has started (AC: "now or earlier").
    await openList(page, {
      role: STAFF,
      now: "2026-01-07T18:00:00Z",
      scenarios: ["appointmentsEveryStatus"],
    });
    await expect(tabs(page)).toHaveCount(4);
    await expectTabsRows(page, {
      "Needs action": [3, 1], // CONFIRMED started only, soonest first; row 2 not here
      Past: [2, 1, 3, 4, 5], // newest first; the started REQUESTED row is here
      Cancelled: [6],
    });
    await openTab(page, "Upcoming");
    await expect(panel(page).getByText("No upcoming appointments", { exact: true })).toBeVisible();
    await expectRows(page, []);
  });

  test("AC1 AC2 AC3 @qa-verify a COMPLETED row in the future is in Past, not Upcoming; a CONFIRMED row not started is not in Needs action", async ({
    page,
  }) => {
    // Now is before rows 1-4: row 4 is COMPLETED but its start is still ahead.
    await openList(page, {
      role: STAFF,
      now: "2026-01-01T12:00:00Z",
      scenarios: ["appointmentsEveryStatus"],
    });
    await expectTabsRows(page, {
      Upcoming: [3, 1, 2], // soonest first; COMPLETED row 4 and CANCELLED row 6 excluded
      "Needs action": [2], // only the REQUESTED row not started
      Past: [4, 5], // COMPLETED and NO_SHOW, newest first
      Cancelled: [6],
    });
  });

  test("AC4 @qa-verify Cancelled lists only CANCELLED rows, future and past, newest first", async ({
    page,
  }) => {
    // appointmentsTwoClinics: cancelled rows 33 (Oct 14), 38 (Oct 16), 39 (Oct 2); now Oct 9.
    await openList(page, {
      role: STAFF,
      now: "2026-10-09T17:00:00Z",
      scenarios: ["appointmentsTwoClinics"],
    });
    await expectTabsRows(page, {
      Cancelled: [38, 33, 39],
      Upcoming: [31, 34, 35], // no CANCELLED row, though 33 and 38 are in the future
      Past: [37, 32, 36], // no CANCELLED row, though 39 is in the past
    });
  });

  test("AC1 AC3 AC4 @qa-verify a patient sees the same Upcoming, Past and Cancelled rows as the AC rules give", async ({
    page,
  }) => {
    await openList(page, {
      role: "PATIENT",
      now: "2026-01-04T18:00:00Z",
      scenarios: ["appointmentsEveryStatus"],
    });
    await expect(tabs(page)).toHaveCount(3);
    await expectTabsRows(page, {
      Upcoming: [1, 2],
      Past: [3, 4, 5],
      Cancelled: [6],
    });
  });
});
