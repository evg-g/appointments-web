import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  clinicFilter,
  dayHeadings,
  expectRows,
  openList,
  openTab,
  panel,
  rowId,
  rows,
  tab,
  tabs,
} from "./qaList";

/**
 * AURORA-8 round 2: the user's answers to the round-1 questions (now acceptance text) and the
 * reviewer's coverage gaps.
 *   Answer 1: a clinic with no appointments (others have some): tabs show "(0)" and each tab's own
 *             empty message; the filter stays visible; not "No appointments yet".
 *   Answer 2: an unknown ?clinic= id falls back to All clinics.
 *   Answer 3: times keep the leading zero ("09:30 AM PST") - applied in appointments-day-groups.
 *   Answer 4: Home / End go to the first / last tab; ArrowLeft on the first tab wraps to the last.
 */

const EVERY_NOW = "2026-01-04T18:00:00Z";
const OCTOBER_NOW = "2026-10-09T17:00:00Z";
const DOWNTOWN_ID = "c1111111-1111-4111-8111-000000000001";
const RIVERSIDE_ID = "c2222222-2222-4222-8222-000000000002";

function clinicParam(page: Page): string | null {
  return new URL(page.url()).searchParams.get("clinic");
}

/** The clinic cell of every row in the open tab. */
async function clinicCells(page: Page): Promise<string[]> {
  return rows(page).evaluateAll((els) =>
    els.map((el) => (el.querySelectorAll("td")[1]?.textContent ?? "").trim()),
  );
}

/** The href of the first / last row link in the open tab. */
function firstRowLink(page: Page) {
  return rows(page).first().getByRole("link");
}
function lastRowLink(page: Page) {
  return rows(page).last().getByRole("link");
}

test.describe("AURORA-8 answer 1: a clinic with no appointments (AC8, AC11)", () => {
  test("AC8 AC11 @qa-verify staff: a clinic with no appointments shows (0) and each tab's own empty message", async ({
    page,
  }) => {
    // appointmentsTwoClinics has rows only at Downtown and Riverside; clinicsManyPages adds
    // "Aurora Satellite NN" clinics with no rows.
    await openList(page, {
      role: "CLINICIAN",
      now: OCTOBER_NOW,
      scenarios: ["appointmentsTwoClinics", "clinicsManyPages"],
    });
    await expect(tabs(page)).toHaveText([
      "Upcoming (3)",
      "Needs action (2)",
      "Past (3)",
      "Cancelled (3)",
    ]);
    await clinicFilter(page).selectOption({ label: "Aurora Satellite 01" });
    await expect(tabs(page)).toHaveText([
      "Upcoming (0)",
      "Needs action (0)",
      "Past (0)",
      "Cancelled (0)",
    ]);
    for (const [label, message] of [
      ["Upcoming", "No upcoming appointments"],
      ["Needs action", "Nothing needs action"],
      ["Past", "No past appointments"],
      ["Cancelled", "No cancelled appointments"],
    ] as const) {
      await openTab(page, label);
      await expect(panel(page).getByText(message, { exact: true })).toBeVisible();
      await expect(panel(page).getByRole("link", { name: "Book appointment" })).toBeVisible();
      await expectRows(page, []);
    }
    await expect(page.getByText("No appointments yet")).toHaveCount(0);
    await expect(clinicFilter(page)).toBeVisible();
    await expect(clinicFilter(page).locator("option:checked")).toHaveText("Aurora Satellite 01");
    // The filter still works to go back.
    await clinicFilter(page).selectOption({ label: "All clinics" });
    await expect(tabs(page)).toHaveText([
      "Upcoming (3)",
      "Needs action (2)",
      "Past (3)",
      "Cancelled (3)",
    ]);
  });

  test("AC8 AC11 @qa-verify patient: a clinic with no appointments shows (0) and the tab's empty message", async ({
    page,
  }) => {
    await openList(page, {
      role: "PATIENT",
      now: OCTOBER_NOW,
      scenarios: ["appointmentsTwoClinics", "clinicsManyPages"],
    });
    await clinicFilter(page).selectOption({ label: "Aurora Satellite 01" });
    await expect(tabs(page)).toHaveText(["Upcoming (0)", "Past (0)", "Cancelled (0)"]);
    await expect(panel(page).getByText("No upcoming appointments", { exact: true })).toBeVisible();
    await expect(page.getByText("No appointments yet")).toHaveCount(0);
    await expect(clinicFilter(page)).toBeVisible();
  });
});

test.describe("AURORA-8 answer 2: an unknown ?clinic= id (AC11)", () => {
  for (const id of ["00000000-0000-4000-8000-000000000000", "nonsense"]) {
    test(`AC11 @qa-verify ?clinic=${id} falls back to All clinics`, async ({ page }) => {
      await openList(page, {
        role: "CLINICIAN",
        now: OCTOBER_NOW,
        scenarios: ["appointmentsTwoClinics"],
        search: `?clinic=${id}`,
      });
      await expect(clinicFilter(page).locator("option:checked")).toHaveText("All clinics");
      await expect(tabs(page)).toHaveText([
        "Upcoming (3)",
        "Needs action (2)",
        "Past (3)",
        "Cancelled (3)",
      ]);
      await expectRows(page, [31, 34, 35]);
    });
  }

  test("AC11 AC6 @qa-verify an unknown clinic id with ?tab=past opens Past for all clinics", async ({
    page,
  }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: OCTOBER_NOW,
      scenarios: ["appointmentsTwoClinics"],
      search: "?clinic=00000000-0000-4000-8000-000000000000&tab=past",
    });
    await expect(tab(page, "Past")).toHaveAttribute("aria-selected", "true");
    await expect(clinicFilter(page).locator("option:checked")).toHaveText("All clinics");
    await expectRows(page, [37, 32, 36]);
  });
});

test.describe("AURORA-8 answer 4: Home, End and ArrowLeft wrap (AC12)", () => {
  test("AC12 @qa-verify staff: End goes to the last tab, Home to the first", async ({ page }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: EVERY_NOW,
      scenarios: ["appointmentsEveryStatus"],
    });
    await tab(page, "Upcoming").focus();
    await page.keyboard.press("End");
    await expect(tab(page, "Cancelled")).toBeFocused();
    await expect(tab(page, "Cancelled")).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(/[?&]tab=cancelled(&|$)/);
    await expectRows(page, [6]);
    await page.keyboard.press("Home");
    await expect(tab(page, "Upcoming")).toBeFocused();
    await expect(tab(page, "Upcoming")).toHaveAttribute("aria-selected", "true");
    await expectRows(page, [1, 2]);
  });

  test("AC12 @qa-verify staff: Home from a middle tab goes to Upcoming, End from a middle tab to Cancelled", async ({
    page,
  }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: EVERY_NOW,
      scenarios: ["appointmentsEveryStatus"],
      search: "?tab=past",
    });
    await tab(page, "Past").focus();
    await page.keyboard.press("Home");
    await expect(tab(page, "Upcoming")).toBeFocused();
    await expect(tab(page, "Upcoming")).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowRight");
    await expect(tab(page, "Needs action")).toBeFocused();
    await page.keyboard.press("End");
    await expect(tab(page, "Cancelled")).toBeFocused();
    await expect(tab(page, "Cancelled")).toHaveAttribute("aria-selected", "true");
  });

  test("AC12 @qa-verify staff: ArrowLeft on the first tab wraps to the last", async ({ page }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: EVERY_NOW,
      scenarios: ["appointmentsEveryStatus"],
    });
    await tab(page, "Upcoming").focus();
    await page.keyboard.press("ArrowLeft");
    await expect(tab(page, "Cancelled")).toBeFocused();
    await expect(tab(page, "Cancelled")).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(/[?&]tab=cancelled(&|$)/);
  });

  test("AC12 @qa-verify patient: ArrowLeft on Upcoming wraps to Cancelled; End and Home use the three tabs", async ({
    page,
  }) => {
    await openList(page, {
      role: "PATIENT",
      now: EVERY_NOW,
      scenarios: ["appointmentsEveryStatus"],
    });
    await tab(page, "Upcoming").focus();
    await page.keyboard.press("ArrowLeft");
    await expect(tab(page, "Cancelled")).toBeFocused();
    await expect(tab(page, "Cancelled")).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Home");
    await expect(tab(page, "Upcoming")).toBeFocused();
    await page.keyboard.press("End");
    await expect(tab(page, "Cancelled")).toBeFocused();
    await expect(tab(page, "Cancelled")).toHaveAttribute("aria-selected", "true");
  });

  test("AC12 @qa-verify quick keys: three ArrowRight presses land on Cancelled; End then Home lands on Upcoming", async ({
    page,
  }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: EVERY_NOW,
      scenarios: ["appointmentsEveryStatus"],
    });
    await tab(page, "Upcoming").focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(tab(page, "Cancelled")).toBeFocused();
    await expect(tab(page, "Cancelled")).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(/[?&]tab=cancelled(&|$)/);
    await page.keyboard.press("End");
    await page.keyboard.press("Home");
    await expect(tab(page, "Upcoming")).toBeFocused();
    await expect(tab(page, "Upcoming")).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(/[?&]tab=upcoming(&|$)/);
  });
});

/**
 * appointmentsManyPagesTwoClinics at OCTOBER_NOW (input rule): row 300 + i, i = 0..149, starts
 * 2026-10-20 18:00Z minus i days; i 0..11 not started (CONFIRMED even, REQUESTED odd); i 12..149
 * started, cycling on i % 4: COMPLETED, NO_SHOW, CANCELLED, CONFIRMED; at Aurora Riverside when
 * i % 3 == 2, else Aurora Downtown. 100 rows per page, newest first. By the AC rules (computed
 * independently from that input rule):
 *   first page: Downtown 8/19/45/14, Riverside 4/9/21/8
 *   all rows:   Downtown 8/27/70/22, Riverside 4/13/34/12
 *   all rows, Downtown: Needs action first = 447, Past last = 448, Cancelled last = 442
 *   all rows, Riverside: Needs action first = 443, Past last = 449, Cancelled last = 446
 */
test.describe("AURORA-8 Load more with the clinic filter (AC11, AC13)", () => {
  test("AC11 AC13 @qa-verify with Aurora Downtown chosen, Load more adds only Downtown rows to the right tabs", async ({
    page,
  }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: OCTOBER_NOW,
      scenarios: ["appointmentsManyPagesTwoClinics"],
    });
    await clinicFilter(page).selectOption({ label: "Aurora Downtown" });
    await expect.poll(() => clinicParam(page)).toBe(DOWNTOWN_ID);
    await expect(tabs(page)).toHaveText([
      "Upcoming (8)",
      "Needs action (19)",
      "Past (45)",
      "Cancelled (14)",
    ]);
    await page.getByRole("button", { name: "Load more" }).click();
    await expect(tabs(page)).toHaveText([
      "Upcoming (8)",
      "Needs action (27)",
      "Past (70)",
      "Cancelled (22)",
    ]);
    expect(clinicParam(page)).toBe(DOWNTOWN_ID);
    await expect(clinicFilter(page).locator("option:checked")).toHaveText("Aurora Downtown");
    await expect(page.getByRole("button", { name: "Load more" })).toHaveCount(0);

    await openTab(page, "Past");
    await expect(rows(page)).toHaveCount(70);
    await expect(lastRowLink(page)).toHaveAttribute("href", `/appointments/${rowId(448)}`);
    const pastClinics = await clinicCells(page);
    expect(pastClinics).toHaveLength(70);
    expect(new Set(pastClinics)).toEqual(new Set(["Aurora Downtown"]));

    await openTab(page, "Needs action");
    await expect(rows(page)).toHaveCount(27);
    await expect(firstRowLink(page)).toHaveAttribute("href", `/appointments/${rowId(447)}`);

    await openTab(page, "Cancelled");
    await expect(rows(page)).toHaveCount(22);
    await expect(lastRowLink(page)).toHaveAttribute("href", `/appointments/${rowId(442)}`);
    expect(new Set(await clinicCells(page))).toEqual(new Set(["Aurora Downtown"]));
  });

  test("AC11 AC13 @qa-verify a ?clinic=<Riverside>&tab=cancelled link, then Load more, grows the Riverside tab", async ({
    page,
  }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: OCTOBER_NOW,
      scenarios: ["appointmentsManyPagesTwoClinics"],
      search: `?clinic=${RIVERSIDE_ID}&tab=cancelled`,
    });
    await expect(tabs(page)).toHaveText([
      "Upcoming (4)",
      "Needs action (9)",
      "Past (21)",
      "Cancelled (8)",
    ]);
    await expect(rows(page)).toHaveCount(8);
    await page.getByRole("button", { name: "Load more" }).click();
    await expect(tabs(page)).toHaveText([
      "Upcoming (4)",
      "Needs action (13)",
      "Past (34)",
      "Cancelled (12)",
    ]);
    await expect(tab(page, "Cancelled")).toHaveAttribute("aria-selected", "true");
    await expect(rows(page)).toHaveCount(12);
    await expect(lastRowLink(page)).toHaveAttribute("href", `/appointments/${rowId(446)}`);
    expect(new Set(await clinicCells(page))).toEqual(new Set(["Aurora Riverside"]));
  });

  test("AC11 AC13 @qa-verify Load more first, then choosing Riverside filters all loaded rows", async ({
    page,
  }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: OCTOBER_NOW,
      scenarios: ["appointmentsManyPagesTwoClinics"],
    });
    await expect(tabs(page)).toHaveText([
      "Upcoming (12)",
      "Needs action (28)",
      "Past (66)",
      "Cancelled (22)",
    ]);
    await page.getByRole("button", { name: "Load more" }).click();
    await expect(tabs(page)).toHaveText([
      "Upcoming (12)",
      "Needs action (40)",
      "Past (104)",
      "Cancelled (34)",
    ]);
    await clinicFilter(page).selectOption({ label: "Aurora Riverside" });
    await expect(tabs(page)).toHaveText([
      "Upcoming (4)",
      "Needs action (13)",
      "Past (34)",
      "Cancelled (12)",
    ]);
    await openTab(page, "Needs action");
    await expect(firstRowLink(page)).toHaveAttribute("href", `/appointments/${rowId(443)}`);
    await openTab(page, "Past");
    await expect(lastRowLink(page)).toHaveAttribute("href", `/appointments/${rowId(449)}`);
  });
});

test.describe("AURORA-8 patient views (AC5, AC8, AC13)", () => {
  test("AC5 AC8 @qa-verify patient: empty Upcoming and Past tabs show their own messages with a Book appointment action", async ({
    page,
  }) => {
    await openList(page, {
      role: "PATIENT",
      now: OCTOBER_NOW,
      scenarios: ["appointmentsOnlyCancelled"],
    });
    await expect(tabs(page)).toHaveText(["Upcoming (0)", "Past (0)", "Cancelled (2)"]);
    for (const [label, message] of [
      ["Upcoming", "No upcoming appointments"],
      ["Past", "No past appointments"],
    ] as const) {
      await openTab(page, label);
      await expect(panel(page).getByText(message, { exact: true })).toBeVisible();
      await expect(panel(page).getByRole("link", { name: "Book appointment" })).toBeVisible();
    }
    await expect(page.getByText("Nothing needs action")).toHaveCount(0);
    await expect(page.getByText("No appointments yet")).toHaveCount(0);
  });

  test('AC5 AC8 @qa-verify patient: an empty Cancelled tab shows "No cancelled appointments" with a Book appointment action', async ({
    page,
  }) => {
    await openList(page, {
      role: "PATIENT",
      now: OCTOBER_NOW,
      scenarios: ["appointmentsNoCancelled"],
      search: "?tab=cancelled",
    });
    await expect(tab(page, "Cancelled")).toHaveText("Cancelled (0)");
    await expect(tab(page, "Cancelled")).toHaveAttribute("aria-selected", "true");
    await expect(panel(page).getByText("No cancelled appointments", { exact: true })).toBeVisible();
    await expect(panel(page).getByRole("link", { name: "Book appointment" })).toBeVisible();
  });

  test("AC5 AC13 @qa-verify patient: Load more grows Upcoming, Past and Cancelled and still no Needs action tab", async ({
    page,
  }) => {
    // appointmentsManyPages, same input rule as above with ids 100 + i, all at Downtown.
    await openList(page, {
      role: "PATIENT",
      now: OCTOBER_NOW,
      scenarios: ["appointmentsManyPages"],
    });
    await expect(tabs(page)).toHaveText(["Upcoming (12)", "Past (66)", "Cancelled (22)"]);
    await page.getByRole("button", { name: "Load more" }).click();
    await expect(tabs(page)).toHaveText(["Upcoming (12)", "Past (104)", "Cancelled (34)"]);
    await expect(page.getByRole("tab", { name: /Needs action/ })).toHaveCount(0);
    await openTab(page, "Past");
    await expect(rows(page)).toHaveCount(104);
    await expect(lastRowLink(page)).toHaveAttribute("href", `/appointments/${rowId(249)}`);
    await openTab(page, "Cancelled");
    await expect(rows(page)).toHaveCount(34);
    await expect(lastRowLink(page)).toHaveAttribute("href", `/appointments/${rowId(246)}`);
  });
});

test.describe("AURORA-8 Today and Tomorrow in other tabs (AC9)", () => {
  test('AC9 @qa-verify a started appointment from this morning is under "Today · Thu, Oct 8" in Needs action and Past', async ({
    page,
  }) => {
    // appointmentsNoCancelled; now Thu Oct 8 13:00 PDT. Row 13 (CONFIRMED, Oct 8 09:00 PDT) has
    // started: Needs action and Past. Row 12 (REQUESTED, Nov 3) has not: Needs action. Row 14
    // COMPLETED Oct 7 and row 15 NO_SHOW Jan 15: Past.
    await openList(page, {
      role: "CLINICIAN",
      now: "2026-10-08T20:00:00Z",
      scenarios: ["appointmentsNoCancelled"],
    });
    await openTab(page, "Needs action");
    await expectRows(page, [13, 12]);
    await expect(dayHeadings(page)).toHaveText(["Today · Thu, Oct 8", "Tue, Nov 3"]);
    await openTab(page, "Past");
    await expectRows(page, [13, 14, 15]);
    await expect(dayHeadings(page)).toHaveText(["Today · Thu, Oct 8", "Wed, Oct 7", "Thu, Jan 15"]);
  });

  test('AC9 @qa-verify a cancelled appointment tomorrow is under "Tomorrow · Tue, Oct 13" in Cancelled', async ({
    page,
  }) => {
    // appointmentsOnlyCancelled: row 21 Oct 13 10:00 PDT, row 22 Jan 20. Now Mon Oct 12 10:00 PDT.
    await openList(page, {
      role: "CLINICIAN",
      now: "2026-10-12T17:00:00Z",
      scenarios: ["appointmentsOnlyCancelled"],
      search: "?tab=cancelled",
    });
    await expectRows(page, [21, 22]);
    await expect(dayHeadings(page)).toHaveText(["Tomorrow · Tue, Oct 13", "Tue, Jan 20"]);
  });
});

test.describe("AURORA-8 axe on every tab (AC12)", () => {
  const STAFF_TABS: { label: string; rows: number[] }[] = [
    { label: "Needs action", rows: [3, 2] },
    { label: "Past", rows: [3, 4, 5] },
    { label: "Cancelled", rows: [6] },
  ];
  for (const { label, rows: expected } of STAFF_TABS) {
    test(`AC12 @qa-verify axe finds no violations on the ${label} tab (staff)`, async ({
      page,
    }) => {
      await openList(page, {
        role: "CLINICIAN",
        now: EVERY_NOW,
        scenarios: ["appointmentsEveryStatus"],
      });
      await openTab(page, label);
      await expectRows(page, expected);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations.map((v) => `${v.id} (${v.impact ?? "?"}): ${v.help}`)).toEqual([]);
    });
  }

  test("AC12 @qa-verify axe finds no violations on an empty tab with its message", async ({
    page,
  }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: OCTOBER_NOW,
      scenarios: ["appointmentsOnlyCancelled"],
    });
    await expect(panel(page).getByText("No upcoming appointments", { exact: true })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => `${v.id} (${v.impact ?? "?"}): ${v.help}`)).toEqual([]);
  });

  test("AC12 @qa-verify axe finds no violations on the patient's Past tab", async ({ page }) => {
    await openList(page, {
      role: "PATIENT",
      now: EVERY_NOW,
      scenarios: ["appointmentsEveryStatus"],
      search: "?tab=past",
    });
    await expectRows(page, [3, 4, 5]);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => `${v.id} (${v.impact ?? "?"}): ${v.help}`)).toEqual([]);
  });
});
