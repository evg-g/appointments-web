import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { expectRows, openList, openTab, panel, rows, tab, tablist, tabs } from "./qaList";

/**
 * AURORA-8 AC5-AC8 and AC12: which tabs each role sees, the tab in the URL, the counts, the empty
 * states and keyboard / screen reader use. Expected labels and messages come from the AC text and
 * the defaulted examples (tab values upcoming / needs-action / past / cancelled; messages
 * "No upcoming appointments" / "Nothing needs action" / "No past appointments" /
 * "No cancelled appointments").
 *
 * appointmentsEveryStatus at 2026-01-04T18:00Z, by the AC rules: Upcoming 1,2; Needs action 3,2;
 * Past 3,4,5; Cancelled 6.
 */

const EVERY_NOW = "2026-01-04T18:00:00Z";
const OCTOBER_NOW = "2026-10-09T17:00:00Z";

test.describe("AURORA-8 tabs by role (AC5)", () => {
  test("AC5 @qa-verify a clinician sees four tabs: Upcoming, Needs action, Past, Cancelled", async ({
    page,
  }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: EVERY_NOW,
      scenarios: ["appointmentsEveryStatus"],
    });
    await expect(tabs(page)).toHaveText([
      /^Upcoming\b/,
      /^Needs action\b/,
      /^Past\b/,
      /^Cancelled\b/,
    ]);
  });

  test("AC5 @qa-verify an admin sees four tabs: Upcoming, Needs action, Past, Cancelled", async ({
    page,
  }) => {
    await openList(page, {
      role: "PLATFORM_ADMIN",
      now: EVERY_NOW,
      scenarios: ["appointmentsEveryStatus"],
    });
    await expect(tabs(page)).toHaveText([
      /^Upcoming\b/,
      /^Needs action\b/,
      /^Past\b/,
      /^Cancelled\b/,
    ]);
  });

  test("AC5 @qa-verify a patient sees Upcoming, Past, Cancelled and no Needs action tab", async ({
    page,
  }) => {
    await openList(page, {
      role: "PATIENT",
      now: EVERY_NOW,
      scenarios: ["appointmentsEveryStatus"],
    });
    await expect(tabs(page)).toHaveText([/^Upcoming\b/, /^Past\b/, /^Cancelled\b/]);
    await expect(page.getByRole("tab", { name: /Needs action/ })).toHaveCount(0);
    await expect(page.getByText(/Needs action/)).toHaveCount(0);
  });

  test("AC5 AC6 @qa-verify a patient who opens ?tab=needs-action gets the Upcoming tab", async ({
    page,
  }) => {
    await openList(page, {
      role: "PATIENT",
      now: EVERY_NOW,
      scenarios: ["appointmentsEveryStatus"],
      search: "?tab=needs-action",
    });
    await expect(tab(page, "Upcoming")).toHaveAttribute("aria-selected", "true");
    await expect(tabs(page)).toHaveCount(3);
    await expectRows(page, [1, 2]);
  });
});

test.describe("AURORA-8 tab in the URL (AC6)", () => {
  test("AC6 @qa-verify Upcoming is open by default", async ({ page }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: EVERY_NOW,
      scenarios: ["appointmentsEveryStatus"],
    });
    await expect(tab(page, "Upcoming")).toHaveAttribute("aria-selected", "true");
    await expect(tabs(page).and(page.locator('[aria-selected="true"]'))).toHaveCount(1);
    await expectRows(page, [1, 2]);
  });

  test("AC6 @qa-verify clicking Past puts ?tab=past in the URL and Past stays open after a reload", async ({
    page,
  }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: EVERY_NOW,
      scenarios: ["appointmentsEveryStatus"],
    });
    await openTab(page, "Past");
    await expect(page).toHaveURL(/[?&]tab=past(&|$)/);
    await page.reload();
    await expect(tab(page, "Past")).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(/[?&]tab=past(&|$)/);
    await expectRows(page, [3, 4, 5]);
  });

  const LINKS: { value: string; label: string; rows: number[] }[] = [
    { value: "upcoming", label: "Upcoming", rows: [1, 2] },
    { value: "needs-action", label: "Needs action", rows: [3, 2] },
    { value: "past", label: "Past", rows: [3, 4, 5] },
    { value: "cancelled", label: "Cancelled", rows: [6] },
  ];
  for (const link of LINKS) {
    test(`AC6 @qa-verify a link with ?tab=${link.value} opens the ${link.label} tab`, async ({
      page,
    }) => {
      await openList(page, {
        role: "CLINICIAN",
        now: EVERY_NOW,
        scenarios: ["appointmentsEveryStatus"],
        search: `?tab=${link.value}`,
      });
      await expect(tab(page, link.label)).toHaveAttribute("aria-selected", "true");
      await expectRows(page, link.rows);
    });
  }

  test("AC6 @qa-verify an unknown ?tab=nonsense opens the Upcoming tab", async ({ page }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: EVERY_NOW,
      scenarios: ["appointmentsEveryStatus"],
      search: "?tab=nonsense",
    });
    await expect(tab(page, "Upcoming")).toHaveAttribute("aria-selected", "true");
    await expectRows(page, [1, 2]);
  });
});

test.describe("AURORA-8 tab counts (AC7)", () => {
  test("AC7 @qa-verify each staff tab label shows its count and the count equals the rows in that tab", async ({
    page,
  }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: EVERY_NOW,
      scenarios: ["appointmentsEveryStatus"],
    });
    await expect(tabs(page)).toHaveText([
      "Upcoming (2)",
      "Needs action (2)",
      "Past (3)",
      "Cancelled (1)",
    ]);
    for (const [label, count] of [
      ["Upcoming", 2],
      ["Needs action", 2],
      ["Past", 3],
      ["Cancelled", 1],
    ] as const) {
      await openTab(page, label);
      await expect(rows(page)).toHaveCount(count);
    }
  });

  test("AC7 @qa-verify unequal counts and a tab with no appointments shows (0)", async ({
    page,
  }) => {
    // appointmentsUnequalTabs at Oct 9 17:00Z: 41 Oct 12 CONFIRMED, 42 Oct 14 CONFIRMED,
    // 43 Oct 13 REQUESTED, 44 Oct 8 CONFIRMED (started). AC: 3 / 2 / 1 / 0.
    await openList(page, {
      role: "CLINICIAN",
      now: OCTOBER_NOW,
      scenarios: ["appointmentsUnequalTabs"],
    });
    await expect(tabs(page)).toHaveText([
      "Upcoming (3)",
      "Needs action (2)",
      "Past (1)",
      "Cancelled (0)",
    ]);
    for (const [label, count] of [
      ["Upcoming", 3],
      ["Needs action", 2],
      ["Past", 1],
      ["Cancelled", 0],
    ] as const) {
      await openTab(page, label);
      await expect(rows(page)).toHaveCount(count);
    }
  });

  test("AC7 @qa-verify a patient's three tab labels show their counts", async ({ page }) => {
    await openList(page, {
      role: "PATIENT",
      now: OCTOBER_NOW,
      scenarios: ["appointmentsUnequalTabs"],
    });
    await expect(tabs(page)).toHaveText(["Upcoming (3)", "Past (1)", "Cancelled (0)"]);
  });
});

test.describe("AURORA-8 empty states (AC8)", () => {
  const EMPTY: { label: string; message: string }[] = [
    { label: "Upcoming", message: "No upcoming appointments" },
    { label: "Needs action", message: "Nothing needs action" },
    { label: "Past", message: "No past appointments" },
  ];
  for (const { label, message } of EMPTY) {
    test(`AC8 @qa-verify an empty ${label} tab shows "${message}" with a Book appointment action`, async ({
      page,
    }) => {
      // appointmentsOnlyCancelled: two CANCELLED rows only, so every other tab is empty.
      await openList(page, {
        role: "CLINICIAN",
        now: OCTOBER_NOW,
        scenarios: ["appointmentsOnlyCancelled"],
      });
      await openTab(page, label);
      await expect(tab(page, label)).toHaveText(`${label} (0)`);
      await expect(panel(page).getByText(message, { exact: true })).toBeVisible();
      await expect(panel(page).getByRole("link", { name: "Book appointment" })).toBeVisible();
      await expect(page.getByText("No appointments yet")).toHaveCount(0);
    });
  }

  test('AC8 @qa-verify an empty Cancelled tab shows "No cancelled appointments" and the action opens booking', async ({
    page,
  }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: OCTOBER_NOW,
      scenarios: ["appointmentsNoCancelled"],
    });
    await openTab(page, "Cancelled");
    await expect(tab(page, "Cancelled")).toHaveText("Cancelled (0)");
    await expect(panel(page).getByText("No cancelled appointments", { exact: true })).toBeVisible();
    await panel(page).getByRole("link", { name: "Book appointment" }).click();
    await expect(page).toHaveURL(/\/appointments\/new$/);
  });

  test("AC8 @qa-verify a tab with rows shows no empty message", async ({ page }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: OCTOBER_NOW,
      scenarios: ["appointmentsOnlyCancelled"],
    });
    await openTab(page, "Cancelled");
    await expectRows(page, [21, 22]);
    for (const message of [
      "No cancelled appointments",
      "No upcoming appointments",
      "Nothing needs action",
      "No past appointments",
    ]) {
      await expect(page.getByText(message, { exact: true })).toHaveCount(0);
    }
  });

  for (const role of ["CLINICIAN", "PATIENT"] as const) {
    test(`AC8 @qa-verify with no appointments at all a ${role} sees "No appointments yet" and no tabs`, async ({
      page,
    }) => {
      await openList(page, { role, now: OCTOBER_NOW, scenarios: ["appointmentsEmpty"] });
      await expect(page.getByText("No appointments yet")).toBeVisible();
      await expect(page.getByRole("tab")).toHaveCount(0);
      await expect(page.getByRole("tablist")).toHaveCount(0);
      for (const message of ["No upcoming appointments", "Nothing needs action"]) {
        await expect(page.getByText(message, { exact: true })).toHaveCount(0);
      }
    });
  }
});

test.describe("AURORA-8 keyboard and screen reader (AC12)", () => {
  test("AC12 @qa-verify tab roles, one selected tab, and the panel is named by the selected tab", async ({
    page,
  }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: EVERY_NOW,
      scenarios: ["appointmentsEveryStatus"],
    });
    await expect(tablist(page)).toBeVisible();
    await expect(tabs(page)).toHaveCount(4);
    await expect(tab(page, "Upcoming")).toHaveAttribute("aria-selected", "true");
    for (const label of ["Needs action", "Past", "Cancelled"]) {
      await expect(tab(page, label)).toHaveAttribute("aria-selected", "false");
    }
    await expect(page.getByRole("tabpanel", { name: "Upcoming (2)" })).toBeVisible();
    await openTab(page, "Past");
    await expect(page.getByRole("tabpanel", { name: "Past (3)" })).toBeVisible();
    await expect(tab(page, "Upcoming")).toHaveAttribute("aria-selected", "false");
  });

  test("AC12 @qa-verify ArrowRight moves focus and selection to the next tab", async ({ page }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: EVERY_NOW,
      scenarios: ["appointmentsEveryStatus"],
    });
    await tab(page, "Upcoming").focus();
    await expect(tab(page, "Upcoming")).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(tab(page, "Needs action")).toBeFocused();
    await expect(tab(page, "Needs action")).toHaveAttribute("aria-selected", "true");
    await expect(tab(page, "Upcoming")).toHaveAttribute("aria-selected", "false");
    await expectRows(page, [3, 2]);
    // AC6: the open tab is in the URL, however it was opened.
    await expect(page).toHaveURL(/[?&]tab=needs-action(&|$)/);
  });

  test("AC12 @qa-verify ArrowRight on the last tab wraps to the first; ArrowLeft goes back", async ({
    page,
  }) => {
    await openList(page, {
      role: "CLINICIAN",
      now: EVERY_NOW,
      scenarios: ["appointmentsEveryStatus"],
      search: "?tab=cancelled",
    });
    await expect(tab(page, "Cancelled")).toHaveAttribute("aria-selected", "true");
    await tab(page, "Cancelled").focus();
    await page.keyboard.press("ArrowRight");
    await expect(tab(page, "Upcoming")).toBeFocused();
    await expect(tab(page, "Upcoming")).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowRight");
    await expect(tab(page, "Needs action")).toBeFocused();
    await expect(tab(page, "Needs action")).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowLeft");
    await expect(tab(page, "Upcoming")).toBeFocused();
    await expect(tab(page, "Upcoming")).toHaveAttribute("aria-selected", "true");
  });

  test("AC12 @qa-verify two quick ArrowRight presses from Upcoming move two tabs, to Past", async ({
    page,
  }) => {
    // AC12: "the arrow keys move between tabs" - each press moves one tab, however fast they come.
    await openList(page, {
      role: "CLINICIAN",
      now: EVERY_NOW,
      scenarios: ["appointmentsEveryStatus"],
    });
    await tab(page, "Upcoming").focus();
    await expect(tab(page, "Upcoming")).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(tab(page, "Past")).toBeFocused();
    await expect(tab(page, "Past")).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(/[?&]tab=past(&|$)/);
  });

  test("AC12 @qa-verify for a patient ArrowRight on Cancelled wraps to Upcoming (three tabs)", async ({
    page,
  }) => {
    await openList(page, {
      role: "PATIENT",
      now: EVERY_NOW,
      scenarios: ["appointmentsEveryStatus"],
      search: "?tab=past",
    });
    await tab(page, "Past").focus();
    await page.keyboard.press("ArrowRight");
    await expect(tab(page, "Cancelled")).toBeFocused();
    await expect(tab(page, "Cancelled")).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowRight");
    await expect(tab(page, "Upcoming")).toBeFocused();
    await expect(tab(page, "Upcoming")).toHaveAttribute("aria-selected", "true");
  });

  for (const role of ["CLINICIAN", "PATIENT"] as const) {
    test(`AC12 @qa-verify axe finds no violations on /appointments with tabs (${role})`, async ({
      page,
    }) => {
      await openList(page, { role, now: EVERY_NOW, scenarios: ["appointmentsEveryStatus"] });
      await expect(tab(page, "Upcoming")).toHaveAttribute("aria-selected", "true");
      await expectRows(page, [1, 2]);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations.map((v) => `${v.id} (${v.impact ?? "?"}): ${v.help}`)).toEqual([]);
    });
  }
});
