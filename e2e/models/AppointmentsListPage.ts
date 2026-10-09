import { expect, type Locator, type Page } from "@playwright/test";

/** A tab on the appointments list, by its label without the count. */
export type AppointmentsTab = "Upcoming" | "Needs action" | "Past" | "Cancelled";

/** The appointments list at /appointments: its tabs, empty and error states. */
export class AppointmentsListPage {
  readonly heading: Locator;
  /** The row of tabs (Upcoming, Needs action, Past, Cancelled). */
  readonly tablist: Locator;
  /** Every tab in the tablist, in order. */
  readonly tabs: Locator;
  /** The panel of the open tab. */
  readonly panel: Locator;
  readonly bookLink: Locator;
  readonly retryButton: Locator;
  readonly emptyState: Locator;
  /** The "Clinic" select: "All clinics" and each clinic. */
  readonly clinicFilter: Locator;
  /** The button under the tabs that loads the next page of appointments. */
  readonly loadMoreButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { level: 1, name: "Appointments" });
    this.bookLink = page.getByRole("link", { name: /book/i }).first();
    this.retryButton = page.getByRole("button", { name: /retry|try again/i });
    this.emptyState = page.getByText(/no appointments yet/i);
    this.tablist = page.getByRole("tablist", { name: "Appointments" });
    this.tabs = this.tablist.getByRole("tab");
    this.panel = page.getByRole("tabpanel");
    this.clinicFilter = page.getByRole("combobox", { name: "Clinic" });
    this.loadMoreButton = page.getByRole("button", { name: "Load more" });
  }

  /** Choose a clinic by its name ("All clinics" or e.g. "Aurora Downtown") in the clinic filter. */
  async filterByClinic(name: string): Promise<void> {
    await this.clinicFilter.selectOption({ label: name });
  }

  /** The name of the option chosen in the clinic filter, e.g. "All clinics". */
  async chosenClinic(): Promise<string> {
    return (await this.clinicFilter.locator("option:checked").innerText()).trim();
  }

  /** The value (clinic id) of the clinic filter option named `name`. */
  async clinicOptionValue(name: string): Promise<string> {
    const value = await this.clinicFilter
      .getByRole("option", { name, exact: true })
      .getAttribute("value");
    return value ?? "";
  }

  /** Open the list, optionally with a query string such as "?tab=past". */
  async goto(search = ""): Promise<void> {
    await this.page.goto(`/appointments${search}`);
    await expect(this.heading).toBeVisible();
  }

  /** A tab by its label; the label may be followed by a count, e.g. "Upcoming (12)". */
  tab(name: AppointmentsTab): Locator {
    return this.tablist.getByRole("tab", { name: new RegExp(`^${name}(\\s*\\(\\d+\\))?$`) });
  }

  /** The tab labels in order, without their counts. */
  async tabNames(): Promise<string[]> {
    const texts = await this.tabs.allInnerTexts();
    return texts.map((text) => text.replace(/\s*\(\d+\)\s*$/, "").trim());
  }

  /** Click a tab and wait until it is the selected one. */
  async openTab(name: AppointmentsTab): Promise<void> {
    await this.tab(name).click();
    await expect(this.tab(name)).toHaveAttribute("aria-selected", "true");
  }

  /** The count in a tab label, e.g. 12 for "Upcoming (12)"; null when the label has no count. */
  async tabCount(name: AppointmentsTab): Promise<number | null> {
    const text = (await this.tab(name).innerText()).trim();
    const match = /\((\d+)\)$/.exec(text);
    return match?.[1] !== undefined ? Number(match[1]) : null;
  }

  /** The appointment rows of the open tab (rows with a link; header rows have none). */
  get rows(): Locator {
    return this.panel.getByRole("row").filter({ has: this.page.getByRole("link") });
  }

  /** The link of a row: the start time with the clinic's zone, e.g. "10:00 AM PDT". */
  rowLink(row: Locator): Locator {
    return row.getByRole("link");
  }

  /** The cells of a row: time link, clinic, status. */
  rowCells(row: Locator): Locator {
    return row.getByRole("cell");
  }

  /** A day group in the open tab, by its heading, e.g. "Mon, Oct 12" or "Today · Fri, Oct 9". */
  dayGroup(label: string | RegExp): Locator {
    return this.panel.getByRole(
      "group",
      typeof label === "string" ? { name: label, exact: true } : { name: label },
    );
  }

  /** The row in `group` whose link reads `time`, e.g. "10:00 AM PDT". */
  rowAt(group: Locator, time: string): Locator {
    return group
      .getByRole("row")
      .filter({ has: this.page.getByRole("link", { name: time, exact: true }) });
  }

  /** The headings of the day groups in the open tab, in order. */
  get dayHeadings(): Locator {
    return this.panel.getByRole("heading", { level: 2 });
  }

  /**
   * The link of the appointment at `time` (as shown, with zone, e.g. "12:20 PM PST") under the day
   * group of `day` (YYYY-MM-DD, in the clinic's zone). The heading may carry "Today · " /
   * "Tomorrow · " and the year, depending on the viewer's clock.
   */
  appointmentOn(day: string, time: string): Locator {
    const date = new Date(`${day}T12:00:00Z`);
    const text = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(date);
    const year = String(date.getUTCFullYear());
    const heading = new RegExp(`^((Today|Tomorrow) · )?${text}(, ${year})?$`);
    return this.dayGroup(heading).getByRole("link", { name: time, exact: true });
  }

  /** The empty message of the open tab, e.g. "No cancelled appointments". */
  tabEmptyState(message: string): Locator {
    return this.panel.getByText(message, { exact: true });
  }

  /** The Book appointment action inside the open tab's panel. */
  get panelBookLink(): Locator {
    return this.panel.getByRole("link", { name: "Book appointment" });
  }

  async startBooking(): Promise<void> {
    await this.bookLink.click();
  }
}
