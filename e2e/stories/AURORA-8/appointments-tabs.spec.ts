import AxeBuilder from "@axe-core/playwright";

import type { AppointmentsTab } from "../../models";
import { bootScenario, EVERY_STATUS_NOW, seedSession, type Role } from "../../support/helpers";
import { expect, test } from "../../support/fixtures";

// AURORA-8: the appointments list is split into tabs (Upcoming, Needs action, Past, Cancelled).
// Needs action is for staff only. The open tab is kept in the URL as ?tab=, and the tabs follow
// the WAI-ARIA tabs pattern. Data: the `appointmentsEveryStatus` scenario (one appointment in every
// status, src/mocks/appointmentsEveryStatus.ts), booted on every load so it survives a reload; the
// clock is fixed to its "now" so each row lands in the same tab on every run.

const STAFF_TABS: AppointmentsTab[] = ["Upcoming", "Needs action", "Past", "Cancelled"];
const PATIENT_TABS: AppointmentsTab[] = ["Upcoming", "Past", "Cancelled"];

test.describe("AURORA-8 appointments tabs", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date(EVERY_STATUS_NOW));
    await bootScenario(page, "appointmentsEveryStatus");
  });

  test("AC5.ui @agent-trusted staff see four tabs and patients see three without Needs action", async ({
    page,
    appointmentsList,
  }) => {
    for (const role of ["CLINICIAN", "PLATFORM_ADMIN"] satisfies Role[]) {
      await test.step(`${role} sees Upcoming, Needs action, Past, Cancelled in that order`, async () => {
        await seedSession(page, role);
        await appointmentsList.goto();
        await expect(appointmentsList.tabs).toHaveCount(STAFF_TABS.length);
        expect(await appointmentsList.tabNames()).toEqual(STAFF_TABS);
      });
    }

    await test.step("A patient sees Upcoming, Past, Cancelled and no Needs action tab", async () => {
      await seedSession(page, "PATIENT");
      await appointmentsList.goto();
      await expect(appointmentsList.tabs).toHaveCount(PATIENT_TABS.length);
      expect(await appointmentsList.tabNames()).toEqual(PATIENT_TABS);
      await expect(appointmentsList.tab("Needs action")).toHaveCount(0);
    });

    await test.step("A patient on ?tab=needs-action gets the Upcoming tab", async () => {
      await appointmentsList.goto("?tab=needs-action");
      await expect(appointmentsList.tab("Upcoming")).toHaveAttribute("aria-selected", "true");
      await expect(appointmentsList.tab("Needs action")).toHaveCount(0);
    });
  });

  test("AC6.ui @agent-trusted Upcoming is the default and the open tab is kept in the URL across a reload", async ({
    page,
    appointmentsList,
  }) => {
    await seedSession(page, "CLINICIAN");

    await test.step("No tab parameter: Upcoming is selected", async () => {
      await appointmentsList.goto();
      await expect(appointmentsList.tab("Upcoming")).toHaveAttribute("aria-selected", "true");
      for (const other of STAFF_TABS.filter((t) => t !== "Upcoming")) {
        await expect(appointmentsList.tab(other)).toHaveAttribute("aria-selected", "false");
      }
    });

    await test.step("Click Past, then reload: ?tab=past and Past is still selected", async () => {
      await appointmentsList.openTab("Past");
      await expect(page).toHaveURL(/[?&]tab=past(&|$)/);
      await page.reload();
      await expect(appointmentsList.heading).toBeVisible();
      await expect(page).toHaveURL(/[?&]tab=past(&|$)/);
      await expect(appointmentsList.tab("Past")).toHaveAttribute("aria-selected", "true");
      await expect(appointmentsList.tab("Upcoming")).toHaveAttribute("aria-selected", "false");
    });

    const VALUES: [string, AppointmentsTab][] = [
      ["upcoming", "Upcoming"],
      ["needs-action", "Needs action"],
      ["past", "Past"],
      ["cancelled", "Cancelled"],
    ];
    for (const [value, tab] of VALUES) {
      await test.step(`?tab=${value} opens ${tab}`, async () => {
        await appointmentsList.goto(`?tab=${value}`);
        await expect(appointmentsList.tab(tab)).toHaveAttribute("aria-selected", "true");
        await expect(appointmentsList.panel).toHaveAttribute(
          "aria-labelledby",
          (await appointmentsList.tab(tab).getAttribute("id")) ?? "missing-tab-id",
        );
      });
    }

    await test.step("?tab=nonsense opens Upcoming", async () => {
      await appointmentsList.goto("?tab=nonsense");
      await expect(appointmentsList.tab("Upcoming")).toHaveAttribute("aria-selected", "true");
      await expect(appointmentsList.tabs.and(page.locator('[aria-selected="true"]'))).toHaveCount(
        1,
      );
    });
  });

  test("AC12.component @agent-trusted the tabs work with a keyboard and a screen reader", async ({
    page,
    appointmentsList,
  }) => {
    const { tabs, panel } = appointmentsList;
    const tab = (name: AppointmentsTab) => appointmentsList.tab(name);

    /** The tab is focused, selected, the only tab in the tab order, and labels the panel. */
    const expectActive = async (name: AppointmentsTab) => {
      const active = tab(name);
      await expect(active).toBeFocused();
      await expect(active).toHaveAttribute("aria-selected", "true");
      await expect(active).toHaveAttribute("tabindex", "0");
      await expect(tabs.and(page.locator('[aria-selected="true"]'))).toHaveCount(1);
      await expect(tabs.and(page.locator('[tabindex="0"]'))).toHaveCount(1);
      const tabId = await active.getAttribute("id");
      const panelId = await active.getAttribute("aria-controls");
      expect(tabId).toBeTruthy();
      expect(panelId).toBeTruthy();
      await expect(panel).toHaveAttribute("id", panelId ?? "");
      await expect(panel).toHaveAttribute("aria-labelledby", tabId ?? "");
    };

    await test.step("Open the list as a clinician: a tablist with tab roles and one tabpanel", async () => {
      await seedSession(page, "CLINICIAN");
      await appointmentsList.goto();
      await expect(appointmentsList.tablist).toBeVisible();
      await expect(tabs).toHaveCount(4);
      await expect(panel).toHaveCount(1);
    });

    await test.step("Focus Upcoming and press ArrowRight: Needs action is focused and selected", async () => {
      await tab("Upcoming").focus();
      await expect(tab("Upcoming")).toHaveAttribute("aria-selected", "true");
      await page.keyboard.press("ArrowRight");
      await expectActive("Needs action");
      await expect(tab("Upcoming")).toHaveAttribute("aria-selected", "false");
      await expect(tab("Upcoming")).toHaveAttribute("tabindex", "-1");
    });

    await test.step("End goes to the last tab; ArrowRight on it wraps to the first", async () => {
      await page.keyboard.press("End");
      await expectActive("Cancelled");
      await page.keyboard.press("ArrowRight");
      await expectActive("Upcoming");
    });

    await test.step("ArrowLeft on the first tab wraps to the last; ArrowLeft moves back; Home goes first", async () => {
      await page.keyboard.press("ArrowLeft");
      await expectActive("Cancelled");
      await page.keyboard.press("ArrowLeft");
      await expectActive("Past");
      await page.keyboard.press("Home");
      await expectActive("Upcoming");
    });

    await test.step("Axe finds no violations on /appointments", async () => {
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const summary = results.violations
        .map((v) => `${v.id} (${String(v.impact)}): ${v.help}`)
        .join("\n");
      expect(results.violations, `axe violations on /appointments:\n${summary}`).toEqual([]);
    });
  });
});
