import type { AppointmentsTab } from "../../models";
import { bootScenario, OCTOBER_NOW, seedSession } from "../../support/helpers";
import { expect, test } from "../../support/fixtures";

// AURORA-8: the list loads 100 appointments per page, and Load more still loads the next page;
// each new appointment joins its tab and the tab counts. Data: the `appointmentsManyPages` scenario
// (150 rows at Aurora Downtown, newest first, paged by limit/cursor,
// src/mocks/appointmentsEveryStatus.ts); the clock is fixed to its "now".

const TABS: AppointmentsTab[] = ["Upcoming", "Needs action", "Past", "Cancelled"];
/** Staff counts per tab, in tab order: the first page of 100, then all 150 rows. */
const FIRST_PAGE = [12, 28, 66, 22];
const ALL_ROWS = [12, 40, 104, 34];

test.describe("AURORA-8 appointments Load more", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date(OCTOBER_NOW));
    await bootScenario(page, "appointmentsManyPages");
  });

  test("AC13.ui @agent-trusted Load more loads the next page of 100 into the tabs and their counts", async ({
    page,
    appointmentsList,
  }) => {
    await seedSession(page, "PLATFORM_ADMIN");
    await appointmentsList.goto();

    // Older rows, only on the second page: row 149 (Past, a no-show) and row 146 (Cancelled).
    const oldPast = (): ReturnType<typeof appointmentsList.appointmentOn> =>
      appointmentsList.appointmentOn("2026-05-24", "11:00 AM PDT");
    const oldCancelled = (): ReturnType<typeof appointmentsList.appointmentOn> =>
      appointmentsList.appointmentOn("2026-05-27", "11:00 AM PDT");

    await test.step("The first page holds 100 appointments, split over the tabs", async () => {
      await expect(appointmentsList.tab("Upcoming")).toHaveText(
        `Upcoming (${String(FIRST_PAGE[0])})`,
      );
      for (const [index, tab] of TABS.entries()) {
        expect(await appointmentsList.tabCount(tab), `${tab} on the first page`).toBe(
          FIRST_PAGE[index],
        );
      }
      await appointmentsList.openTab("Past");
      await expect(appointmentsList.rows).toHaveCount(FIRST_PAGE[2] ?? -1);
      await expect(oldPast()).toHaveCount(0);
      await expect(appointmentsList.loadMoreButton).toBeVisible();
    });

    await test.step("Press Load more: the counts grow and the older appointments join their tabs", async () => {
      await appointmentsList.loadMoreButton.click();
      await expect(appointmentsList.tab("Past")).toHaveText(`Past (${String(ALL_ROWS[2])})`);
      for (const [index, tab] of TABS.entries()) {
        expect(await appointmentsList.tabCount(tab), `${tab} after Load more`).toBe(
          ALL_ROWS[index],
        );
      }
      await expect(appointmentsList.tab("Past")).toHaveAttribute("aria-selected", "true");
      await expect(appointmentsList.rows).toHaveCount(ALL_ROWS[2] ?? -1);
      await expect(oldPast()).toBeVisible();

      await appointmentsList.openTab("Cancelled");
      await expect(appointmentsList.rows).toHaveCount(ALL_ROWS[3] ?? -1);
      await expect(oldCancelled()).toBeVisible();

      await expect(appointmentsList.loadMoreButton).toHaveCount(0);
    });
  });
});
