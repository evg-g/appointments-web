import type { AppointmentsListPage, AppointmentsTab } from "../../models";
import {
  bootScenario,
  EVERY_STATUS_NOW,
  OCTOBER_NOW,
  seedSession,
  type Role,
  type ScenarioName,
} from "../../support/helpers";
import { expect, test } from "../../support/fixtures";

// AURORA-8: what each tab of the appointments list shows - a count in the tab label, an empty
// message per tab, and rows (time with the clinic's zone as a link, clinic, status) under day
// headings. Data: named MSW scenarios with fixed lists (src/mocks/appointmentsEveryStatus.ts),
// booted on every load; the clock is fixed to each list's "now" so every row lands in the same tab.
//   appointmentsEveryStatus   one appointment in every status (January, PST)
//   appointmentsNoCancelled   rows on PDT and PST dates, nothing cancelled
//   appointmentsOnlyCancelled only cancelled rows
// All rows are at Aurora Downtown (America/Los_Angeles).

const CLINIC = "Aurora Downtown";
const STATUS_LABELS = ["Requested", "Confirmed", "Completed", "Cancelled", "No-show"];
const idOf = (n: number) => `88888888-8888-4888-8888-${String(n).padStart(12, "0")}`;

interface Case {
  scenario: ScenarioName;
  now: string;
  role: Role;
  /** Expected count per visible tab, in tab order. */
  counts: [AppointmentsTab, number][];
}

const CASES: Case[] = [
  {
    scenario: "appointmentsEveryStatus",
    now: EVERY_STATUS_NOW,
    role: "CLINICIAN",
    counts: [
      ["Upcoming", 2],
      ["Needs action", 2],
      ["Past", 3],
      ["Cancelled", 1],
    ],
  },
  {
    scenario: "appointmentsEveryStatus",
    now: EVERY_STATUS_NOW,
    role: "PATIENT",
    counts: [
      ["Upcoming", 2],
      ["Past", 3],
      ["Cancelled", 1],
    ],
  },
  {
    scenario: "appointmentsNoCancelled",
    now: OCTOBER_NOW,
    role: "CLINICIAN",
    counts: [
      ["Upcoming", 2],
      ["Needs action", 2],
      ["Past", 3],
      ["Cancelled", 0],
    ],
  },
  {
    scenario: "appointmentsOnlyCancelled",
    now: OCTOBER_NOW,
    role: "PLATFORM_ADMIN",
    counts: [
      ["Upcoming", 0],
      ["Needs action", 0],
      ["Past", 0],
      ["Cancelled", 2],
    ],
  },
];

test.describe("AURORA-8 appointments list content", () => {
  test("AC7.ui @agent-trusted each tab label shows its count and the count equals the rows in that tab", async ({
    page,
    appointmentsList,
  }) => {
    for (const { scenario, now, role, counts } of CASES) {
      await test.step(`${scenario} as ${role}: ${counts.map(([t, n]) => `${t} (${String(n)})`).join(", ")}`, async () => {
        await page.clock.setFixedTime(new Date(now));
        await bootScenario(page, scenario);
        await seedSession(page, role);
        await appointmentsList.goto();
        await expect(appointmentsList.tabs).toHaveCount(counts.length);

        for (const [index, [tab, count]] of counts.entries()) {
          // The label ends with the count in brackets, e.g. "Upcoming (2)" or "Cancelled (0)".
          await expect(appointmentsList.tabs.nth(index)).toHaveText(`${tab} (${String(count)})`);
          expect(await appointmentsList.tabCount(tab)).toBe(count);
          // And the count equals the rows shown in that tab.
          await appointmentsList.openTab(tab);
          await expect(appointmentsList.rows).toHaveCount(count);
        }
      });
    }
  });

  test("AC8.ui @agent-trusted an empty tab shows its own message and Book appointment; no appointments at all keeps No appointments yet", async ({
    page,
    appointmentsList,
  }) => {
    const MESSAGES: Record<AppointmentsTab, string> = {
      Upcoming: "No upcoming appointments",
      "Needs action": "Nothing needs action",
      Past: "No past appointments",
      Cancelled: "No cancelled appointments",
    };

    /** The open tab shows its empty message and a Book appointment action, and no rows. */
    const expectEmptyTab = async (list: AppointmentsListPage, tab: AppointmentsTab) => {
      await list.openTab(tab);
      await expect(list.tabEmptyState(MESSAGES[tab])).toBeVisible();
      await expect(list.panelBookLink).toBeVisible();
      await expect(list.panelBookLink).toHaveAttribute("href", "/appointments/new");
      await expect(list.rows).toHaveCount(0);
      await expect(list.emptyState).toHaveCount(0);
    };

    /** The open tab has rows and no empty message. */
    const expectFilledTab = async (list: AppointmentsListPage, tab: AppointmentsTab) => {
      await list.openTab(tab);
      await expect(list.rows.first()).toBeVisible();
      for (const message of Object.values(MESSAGES)) {
        await expect(list.tabEmptyState(message)).toHaveCount(0);
      }
    };

    await test.step("Nothing cancelled: the Cancelled tab says No cancelled appointments with Book appointment", async () => {
      await page.clock.setFixedTime(new Date(OCTOBER_NOW));
      await bootScenario(page, "appointmentsNoCancelled");
      await seedSession(page, "CLINICIAN");
      await appointmentsList.goto();
      for (const tab of ["Upcoming", "Needs action", "Past"] satisfies AppointmentsTab[]) {
        await expectFilledTab(appointmentsList, tab);
      }
      await expectEmptyTab(appointmentsList, "Cancelled");
    });

    await test.step("Only cancelled: Upcoming, Needs action and Past each show their own message", async () => {
      await bootScenario(page, "appointmentsOnlyCancelled");
      await appointmentsList.goto();
      for (const tab of ["Upcoming", "Needs action", "Past"] satisfies AppointmentsTab[]) {
        await expectEmptyTab(appointmentsList, tab);
      }
      await expectFilledTab(appointmentsList, "Cancelled");
    });

    await test.step("No appointments at all: No appointments yet as today, with no tabs", async () => {
      await bootScenario(page, "appointmentsEmpty");
      await appointmentsList.goto();
      await expect(appointmentsList.emptyState).toBeVisible();
      await expect(page.getByRole("link", { name: "Book appointment" })).toHaveCount(2);
      await expect(appointmentsList.tablist).toHaveCount(0);
      await expect(appointmentsList.tabs).toHaveCount(0);
      for (const message of Object.values(MESSAGES)) {
        await expect(page.getByText(message, { exact: true })).toHaveCount(0);
      }
    });
  });

  test("AC10.ui @agent-trusted each row shows the start time with the clinic zone as a link, the clinic and the status", async ({
    page,
    appointmentsList,
  }) => {
    const list = appointmentsList;

    /** Every row of every visible tab: time-with-zone link to its appointment, clinic, status badge. */
    const expectEveryRowShape = async (tabs: AppointmentsTab[]) => {
      for (const tab of tabs) {
        await list.openTab(tab);
        const rows = await list.rows.all();
        expect(rows.length, `rows in ${tab}`).toBeGreaterThan(0);
        for (const row of rows) {
          const link = list.rowLink(row);
          await expect(link).toHaveText(/^\d{2}:\d{2} [AP]M P[SD]T$/);
          await expect(link).toHaveAttribute("href", /^\/appointments\/[0-9a-f-]{36}$/);
          const cells = list.rowCells(row);
          await expect(cells).toHaveCount(3);
          await expect(cells.nth(1)).toHaveText(CLINIC);
          const status = (await cells.nth(2).innerText()).trim();
          expect(STATUS_LABELS, `status in ${tab}`).toContain(status);
        }
      }
    };

    await test.step("October list: rows in Upcoming, Needs action and Past, on PDT and PST dates", async () => {
      await page.clock.setFixedTime(new Date(OCTOBER_NOW));
      await bootScenario(page, "appointmentsNoCancelled");
      await seedSession(page, "CLINICIAN");
      await list.goto();
      await expectEveryRowShape(["Upcoming", "Needs action", "Past"]);
    });

    await test.step("10:00 Los Angeles time in October: 10:00 AM PDT, clinic, Confirmed", async () => {
      await list.openTab("Upcoming");
      const group = list.dayGroup("Mon, Oct 12");
      const row = list.rowAt(group, "10:00 AM PDT");
      await expect(row).toHaveCount(1);
      const link = list.rowLink(row);
      await expect(link).toHaveText("10:00 AM PDT");
      await expect(link).toHaveAttribute("href", `/appointments/${idOf(11)}`);
      await expect(list.rowCells(row).nth(1)).toHaveText(CLINIC);
      await expect(list.rowCells(row).nth(2)).toHaveText("Confirmed");
    });

    await test.step("PST dates: 09:30 AM PST in November and 10:00 AM PST in January", async () => {
      const nov = list.rowAt(list.dayGroup("Tue, Nov 3"), "09:30 AM PST");
      await expect(list.rowLink(nov)).toHaveAttribute("href", `/appointments/${idOf(12)}`);
      await expect(list.rowCells(nov).nth(2)).toHaveText("Requested");
      await list.openTab("Past");
      const jan = list.rowAt(list.dayGroup("Thu, Jan 15"), "10:00 AM PST");
      await expect(list.rowLink(jan)).toHaveAttribute("href", `/appointments/${idOf(15)}`);
      await expect(list.rowCells(jan).nth(1)).toHaveText(CLINIC);
      await expect(list.rowCells(jan).nth(2)).toHaveText("No-show");
    });

    await test.step("The October row's link opens /appointments/<id>", async () => {
      await list.openTab("Upcoming");
      await list.rowLink(list.rowAt(list.dayGroup("Mon, Oct 12"), "10:00 AM PDT")).click();
      await expect(page).toHaveURL(new RegExp(`/appointments/${idOf(11)}$`));
    });

    await test.step("Every-status list: rows in all four tabs, including Cancelled", async () => {
      await page.clock.setFixedTime(new Date(EVERY_STATUS_NOW));
      await bootScenario(page, "appointmentsEveryStatus");
      await list.goto();
      await expectEveryRowShape(["Upcoming", "Needs action", "Past", "Cancelled"]);
      await list.openTab("Cancelled");
      await expect(list.rowCells(list.rows.first()).nth(2)).toHaveText("Cancelled");
    });
  });
});
