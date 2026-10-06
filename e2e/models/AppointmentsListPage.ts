import { expect, type Locator, type Page } from "@playwright/test";

/** The appointments list at /appointments, with its empty and error states. */
export class AppointmentsListPage {
  readonly heading: Locator;
  readonly bookLink: Locator;
  readonly retryButton: Locator;
  readonly emptyState: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { level: 1, name: "Appointments" });
    this.bookLink = page.getByRole("link", { name: /book/i }).first();
    this.retryButton = page.getByRole("button", { name: /retry|try again/i });
    this.emptyState = page.getByText(/no appointments yet/i);
  }

  async goto(): Promise<void> {
    await this.page.goto("/appointments");
    await expect(this.heading).toBeVisible();
  }

  /** The link that opens an appointment, by its shown date and time, e.g. "Jan 5, 2026, 12:20 PM PST". */
  appointment(when: string): Locator {
    return this.page.getByRole("link", { name: when });
  }

  async startBooking(): Promise<void> {
    await this.bookLink.click();
  }
}
