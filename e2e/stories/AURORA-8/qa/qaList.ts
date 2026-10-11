import { expect, type Locator, type Page } from "@playwright/test";

import { bootScenario, seedSession, type Role, type ScenarioName } from "../../../support/helpers";

/**
 * QA-local helpers for the AURORA-8 @qa-verify specs. They only reach the page; every expected
 * value lives in the specs and comes from the AURORA-8 acceptance criteria and their examples.
 */

/** The id of row `n` of the scenario fixtures (input data: the id the mock serves for row n). */
export function rowId(n: number): string {
  return `88888888-8888-4888-8888-${String(n).padStart(12, "0")}`;
}

export function tablist(page: Page): Locator {
  return page.getByRole("tablist", { name: "Appointments" });
}

export function tabs(page: Page): Locator {
  return tablist(page).getByRole("tab");
}

/** A tab by its label, with or without a count, e.g. "Past" matches "Past (3)". */
export function tab(page: Page, label: string): Locator {
  return tablist(page).getByRole("tab", { name: new RegExp(`^${label}( \\(\\d+\\))?$`) });
}

export function panel(page: Page): Locator {
  return page.getByRole("tabpanel");
}

/** The appointment links in the open tab, in page order. */
export function rowLinks(page: Page): Locator {
  return panel(page).getByRole("row").getByRole("link");
}

/** The appointment rows (rows that hold a link) in the open tab. */
export function rows(page: Page): Locator {
  return panel(page)
    .getByRole("row")
    .filter({ has: page.getByRole("link") });
}

/** The fixture row numbers of the open tab, in page order (read from each link's href). */
export async function rowNumbers(page: Page): Promise<number[]> {
  const hrefs = await rowLinks(page).evaluateAll((els) =>
    els.map((el) => el.getAttribute("href") ?? ""),
  );
  return hrefs.map((href) => {
    const match = /\/appointments\/88888888-8888-4888-8888-(\d{12})$/.exec(href);
    return match?.[1] !== undefined ? Number(match[1]) : -1;
  });
}

/** Poll until the open tab lists exactly these fixture rows, in this order. */
export async function expectRows(page: Page, expected: number[]): Promise<void> {
  await expect.poll(() => rowNumbers(page)).toEqual(expected);
}

/** The day headings of the open tab. */
export function dayHeadings(page: Page): Locator {
  return panel(page).getByRole("heading", { level: 2 });
}

/** The day group with this exact heading. */
export function dayGroup(page: Page, heading: string): Locator {
  return panel(page).getByRole("group", { name: heading, exact: true });
}

export function clinicFilter(page: Page): Locator {
  return page.getByRole("combobox", { name: "Clinic" });
}

/** Sign in, fix the clock, arrange a scenario, then open the list (optionally with a query). */
export async function openList(
  page: Page,
  opts: { role: Role; now?: string; scenarios?: ScenarioName[]; search?: string },
): Promise<void> {
  if (opts.now !== undefined) await page.clock.setFixedTime(new Date(opts.now));
  await seedSession(page, opts.role);
  for (const name of opts.scenarios ?? []) await bootScenario(page, name);
  await page.goto(`/appointments${opts.search ?? ""}`);
  await expect(page.getByRole("heading", { level: 1, name: "Appointments" })).toBeVisible();
}

/** Click a tab and wait until it is selected. */
export async function openTab(page: Page, label: string): Promise<void> {
  await tab(page, label).click();
  await expect(tab(page, label)).toHaveAttribute("aria-selected", "true");
}

/**
 * Open each tab in turn and check its rows. `expected` maps a tab label to its fixture rows in
 * order. Fails on an empty map (no empty passes).
 */
export async function expectTabsRows(
  page: Page,
  expected: Record<string, number[]>,
): Promise<void> {
  const entries = Object.entries(expected);
  expect(entries.length).toBeGreaterThan(0);
  for (const [label, numbers] of entries) {
    await openTab(page, label);
    await expectRows(page, numbers);
  }
}
