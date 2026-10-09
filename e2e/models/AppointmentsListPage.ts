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

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { level: 1, name: "Appointments" });
    this.bookLink = page.getByRole("link", { name: /book/i }).first();
    this.retryButton = page.getByRole("button", { name: /retry|try again/i });
    this.emptyState = page.getByText(/no appointments yet/i);
    this.tablist = page.getByRole("tablist", { name: "Appointments" });
    this.tabs = this.tablist.getByRole("tab");
    this.panel = page.getByRole("tabpanel");
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

  /** The link that opens an appointment, by its shown date and time, e.g. "Jan 5, 2026, 12:20 PM PST". */
  appointment(when: string): Locator {
    return this.page.getByRole("link", { name: when });
  }

  async startBooking(): Promise<void> {
    await this.bookLink.click();
  }
}
