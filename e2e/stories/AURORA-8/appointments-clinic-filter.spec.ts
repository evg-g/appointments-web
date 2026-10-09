import type { AppointmentsListPage, AppointmentsTab } from "../../models";
import { bootScenario, OCTOBER_NOW, seedSession } from "../../support/helpers";
import { expect, test } from "../../support/fixtures";

// AURORA-8: a clinic filter ("All clinics" + each clinic) limits every tab to one clinic, the tab
// counts follow it, and the choice is kept in the URL as ?clinic=<id> across a reload. Data: the
// `appointmentsTwoClinics` scenario (rows at both seeded clinics in every tab,
// src/mocks/appointmentsEveryStatus.ts), booted on every load; the clock is fixed to its "now".

const ALL = "All clinics";
const DOWNTOWN = "Aurora Downtown";
const RIVERSIDE = "Aurora Riverside";
const TABS: AppointmentsTab[] = ["Upcoming", "Needs action", "Past", "Cancelled"];

/** Staff counts per tab, in tab order, for each choice of the filter. */
const COUNTS: Record<string, number[]> = {
  [ALL]: [3, 2, 3, 3],
  [DOWNTOWN]: [1, 0, 1, 1],
  [RIVERSIDE]: [2, 2, 2, 2],
};

/**
 * Open every tab and check its count and rows: for one clinic, every row is at that clinic; for
 * All clinics, the rows of every tab together are at both clinics.
 */
async function expectTabs(list: AppointmentsListPage, choice: string): Promise<void> {
  const expected = COUNTS[choice] ?? [];
  const seen = new Set<string>();
  for (const [index, tab] of TABS.entries()) {
    const count = expected[index] ?? -1;
    expect(await list.tabCount(tab), `${tab} count for ${choice}`).toBe(count);
    await list.openTab(tab);
    await expect(list.rows, `${tab} rows for ${choice}`).toHaveCount(count);
    for (const row of await list.rows.all()) {
      const clinic = (await list.rowCells(row).nth(1).innerText()).trim();
      seen.add(clinic);
      if (choice !== ALL) expect(clinic, `${tab} row clinic for ${choice}`).toBe(choice);
    }
  }
  if (choice === ALL) expect([...seen].sort()).toEqual([DOWNTOWN, RIVERSIDE]);
}

test.describe("AURORA-8 appointments clinic filter", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date(OCTOBER_NOW));
    await bootScenario(page, "appointmentsTwoClinics");
  });

  test("AC11.ui @agent-trusted the clinic filter limits every tab and its counts and survives a reload as ?clinic=", async ({
    page,
    appointmentsList,
  }) => {
    await seedSession(page, "PLATFORM_ADMIN");
    await appointmentsList.goto();

    await test.step("All clinics is chosen by default and every tab has rows at both clinics", async () => {
      await expect(appointmentsList.clinicFilter).toBeVisible();
      await expect.poll(() => appointmentsList.chosenClinic()).toBe(ALL);
      await expect(page).not.toHaveURL(/[?&]clinic=/);
      await expectTabs(appointmentsList, ALL);
    });

    for (const clinic of [DOWNTOWN, RIVERSIDE]) {
      await test.step(`Choose ${clinic}: every row in every tab is there, counts follow, ?clinic=<id>, ?tab= kept`, async () => {
        await appointmentsList.openTab("Past");
        const id = await appointmentsList.clinicOptionValue(clinic);
        expect(id).not.toBe("");
        await appointmentsList.filterByClinic(clinic);
        await expect(page).toHaveURL(new RegExp(`[?&]clinic=${id}(&|$)`));
        await expect(page).toHaveURL(/[?&]tab=past(&|$)/);
        await expect(appointmentsList.tab("Past")).toHaveAttribute("aria-selected", "true");
        await expectTabs(appointmentsList, clinic);
      });
    }

    await test.step("Reload with ?clinic=<id>: the filter still shows the clinic and rows stay filtered", async () => {
      const id = await appointmentsList.clinicOptionValue(RIVERSIDE);
      await page.reload();
      await expect(appointmentsList.heading).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`[?&]clinic=${id}(&|$)`));
      await expect(appointmentsList.rows.first()).toBeVisible();
      await expect.poll(() => appointmentsList.chosenClinic()).toBe(RIVERSIDE);
      await expectTabs(appointmentsList, RIVERSIDE);
    });

    await test.step("Choose All clinics again: the clinic parameter is gone and all rows return", async () => {
      await appointmentsList.filterByClinic(ALL);
      await expect(page).not.toHaveURL(/[?&]clinic=/);
      await expect(page).toHaveURL(/[?&]tab=/);
      await expect.poll(() => appointmentsList.chosenClinic()).toBe(ALL);
      await expectTabs(appointmentsList, ALL);
    });
  });
});
